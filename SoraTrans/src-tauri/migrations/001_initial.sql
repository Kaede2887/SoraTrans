CREATE TABLE IF NOT EXISTS "project_info" (
	"id"	INTEGER NOT NULL,
	"title"	TEXT NOT NULL,
	"root_path"	TEXT NOT NULL UNIQUE,
	"icon_path"	TEXT NOT NULL,
	"cover_path"	TEXT,
	"db_path"	TEXT,
	"rating"	REAL,
	"description"	TEXT,
	"file_path"	TEXT NOT NULL,
	"manufactor"	TEXT,
	"status" INTEGER NOT NULL DEFAULT(0),
	"create_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	"update_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "tags" (
	"id"	TEXT NOT NULL UNIQUE,
	"name"	TEXT,
	"category"	TEXT,
	"vn_count"	INTEGER,
	"description"	TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "game_tags" (
	"id"	INTEGER NOT NULL UNIQUE,
	"project_id"	INTEGER NOT NULL,
	"tags_id"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "project_id_foreign" FOREIGN KEY("project_id") REFERENCES "project_info"("id"),
	CONSTRAINT "tags_id_foreign" FOREIGN KEY("tags_id") REFERENCES "tags"("id")
);
