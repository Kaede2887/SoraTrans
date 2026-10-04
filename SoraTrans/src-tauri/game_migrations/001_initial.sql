CREATE TABLE IF NOT EXISTS "assets" (
	"id"	INTEGER NOT NULL UNIQUE,
	"name"	TEXT NOT NULL,
	"size"	TEXT,
	"path"	TEXT NOT NULL UNIQUE,
	"status"	INTEGER DEFAULT 0,
	"line_count"	INTEGER DEFAULT 0,
	"parent_bundle_name"	TEXT,
	"create_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	"update_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "foreign_bundle_name" FOREIGN KEY("parent_bundle_name") REFERENCES "bundle"("name")
);
CREATE TABLE IF NOT EXISTS "assets_object" (
	"id"	INTEGER NOT NULL UNIQUE,
	"name"	TEXT NOT NULL,
	"type"	TEXT NOT NULL,
	"path_id"	INTEGER NOT NULL UNIQUE,
	"asset_id"	INTEGER NOT NULL,
	"size"	INTEGER NOT NULL,
	"status"	INTEGER NOT NULL DEFAULT 1,
	"line_count"	INTEGER DEFAULT 0,
	"create_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	"update_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "asset_id_foreign" FOREIGN KEY("asset_id") REFERENCES "assets"("id")
);
CREATE TABLE IF NOT EXISTS "bundle" (
	"id"	INTEGER NOT NULL UNIQUE,
	"name"	TEXT NOT NULL UNIQUE,
	"size"	TEXT,
	"path"	TEXT NOT NULL,
	"parent_bundle_name"	TEXT,
	"create_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	"update_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "text_origin" (
	"id"	INTEGER NOT NULL UNIQUE,
	"object_id"	INTEGER NOT NULL,
	"pattern_id"	INTEGER NOT NULL,
	"text"	TEXT NOT NULL,
	"text_template" TEXT,
	"field_path"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "object_id_foreign" FOREIGN KEY("object_id") REFERENCES "assets_object"("id"),
	CONSTRAINT "pattern_id_foreign" FOREIGN KEY("pattern_id") REFERENCES "text_pattern"("id")
);
CREATE TABLE IF NOT EXISTS "text_pattern" (
	"id"	INTEGER NOT NULL UNIQUE,
	"pattern"	TEXT NOT NULL UNIQUE,
	"semantic"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "text_translate" (
	"id"	INTEGER NOT NULL UNIQUE,
	"origin_id"	INTEGER NOT NULL UNIQUE,
	"text"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "origin_id_foreign" FOREIGN KEY("origin_id") REFERENCES "text_origin"("id")
);
