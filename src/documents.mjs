const allowedExt = new Set(["txt", "pdf", "docx"]);
const extMime = { txt: "text/plain; charset=utf-8", pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
const zipError = () => { throw new Error("Некорректный архив документа"); };
async function docxText(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  const minimum = Math.max(0, end - 65535);
  while (end >= minimum && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < minimum) zipError();
  let index = view.getUint32(end + 16, true);
  const entries = Math.min(view.getUint16(end + 10, true), 1000);
  for (let i = 0; i < entries && index + 46 <= end; i++) {
    if (view.getUint32(index, true) !== 0x02014b50) zipError();
    const method = view.getUint16(index + 10, true);
    const length = view.getUint32(index + 20, true);
    const uncompressed = view.getUint32(index + 24, true);
    const nameSize = view.getUint16(index + 28, true);
    const offset = view.getUint32(index + 42, true);
    const name = textDecoder.decode(bytes.subarray(index + 46, index + 46 + nameSize));
    if (name === "word/document.xml") {
      if (uncompressed > 2 * 1024 * 1024 || offset + 30 > index || ![0, 8].includes(method)) zipError();
      if (view.getUint32(offset, true) !== 0x04034b50) zipError();
      const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
      if (start + length > index) zipError();
      const packedBytes = bytes.slice(start, start + length);
      let xml;
      if (method === 0) xml = textDecoder.decode(packedBytes);
      else {
        const reader = new Blob([packedBytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
        let size = 0;
        const decoder = new TextDecoder();
        const pieces = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2 * 1024 * 1024) {
            await reader.cancel();
            zipError();
          }
          pieces.push(decoder.decode(value, { stream: true }));
        }
        xml = pieces.join("") + decoder.decode();
      }
      const paragraphs = xml.split(/<\/w:p>/g).map(par => [...par.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match => match[1]).join(""));
      return paragraphs.join("\n").replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ({amp:"&",lt:"<",gt:">",quot:'"',apos:"'"})[name]);
    }
    index += 46 + nameSize + view.getUint16(index + 30, true) + view.getUint16(index + 32, true);
  }
  zipError();
}
async function prepareResume(ctx, required) {
  const resumeText = field(ctx.body.resumeText, "resumeText", limits.resume);
  const file = ctx.body.resumeFile;
  let attachment = null;
  let extracted = "";
  let extractStatus = "not_needed";
  if (file !== undefined && !((file instanceof Blob) && typeof file.name === "string")) invalid("resumeFile", "invalid_file", "Приложите файл через форму.");
  if (file?.size) {
    const safeName = file.name.split(/[\\/]/).at(-1).replace(/[\u0000-\u001f\u007f]/g, "").slice(-160);
    const ext = safeName.toLowerCase().split(".").at(-1);
    if (!allowedExt.has(ext)) invalid("resumeFile", "invalid_extension", "Допустимы PDF, DOCX или TXT.");
    if (!ctx.env.BUCKET) fail(503, "file_storage_unavailable", "Хранилище файлов временно недоступно. Можно вставить текст резюме.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (ext === "pdf" && textDecoder.decode(bytes.slice(0, 8)).indexOf("%PDF-") !== 0) invalid("resumeFile", "invalid_file", "Содержимое файла не соответствует формату PDF.");
    if (ext === "docx" && (bytes[0] !== 80 || bytes[1] !== 75)) invalid("resumeFile", "invalid_file", "Содержимое файла не соответствует формату DOCX.");
    if (!resumeText) {
      try {
        if (ext === "txt") extracted = textDecoder.decode(bytes);
        if (ext === "docx") extracted = await docxText(bytes);
        if (ext === "pdf" && ctx.env.extractPdf) extracted = await ctx.env.extractPdf(bytes);
      } catch {
        extractStatus = "manual";
      }
      extracted = extracted.replaceAll("\0", "").trim();
      extractStatus = extracted.length > limits.resume ? "truncated" : extracted ? "extracted" : "manual";
    }
    attachment = { name: safeName, size: file.size, type: extMime[ext], bytes };
  }
  if (required && !resumeText && !attachment) invalid("resumeText", "required", "Добавьте текст или файл резюме.");
  return { text: resumeText || extracted.slice(0, limits.resume), attachment, extractStatus };
}
