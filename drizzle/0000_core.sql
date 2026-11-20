CREATE TABLE records (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  sort TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL CHECK (json_valid(data)),
  rev INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, id)
);
--> statement-breakpoint
CREATE INDEX records_scope_sort ON records(kind, scope, sort DESC, id);
--> statement-breakpoint
CREATE INDEX records_kind_sort ON records(kind, sort DESC, id);
--> statement-breakpoint
CREATE TABLE transaction_guard (
  id TEXT PRIMARY KEY,
  ok INTEGER NOT NULL CHECK (ok = 1)
);
