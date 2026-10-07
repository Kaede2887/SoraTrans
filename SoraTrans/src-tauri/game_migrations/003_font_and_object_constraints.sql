-- 1) font 表：补 kind/font_names/font_data_size 列，
--    并把 path_id 全局唯一改为 (path_id, asset_id) 复合唯一。
--    font 表为本次新增、尚无业务数据，直接重建（无外键引用它，DROP 安全）。
--    老库若已执行过 002 也适用：DROP IF EXISTS 兼容表不存在的情况。
DROP TABLE IF EXISTS "font";
CREATE TABLE "font" (
	"id"	INTEGER NOT NULL UNIQUE,
	"kind"	TEXT NOT NULL DEFAULT 'TMP',
	"name"	TEXT NOT NULL,
	"family_name"	TEXT,
	"style_name"	TEXT,
	"version"	TEXT,
	"point_size"	REAL,
	"atlas_width"	INTEGER,
	"atlas_height"	INTEGER,
	"atlas_padding"	INTEGER,
	"atlas_render_mode"	INTEGER,
	"population_mode"	INTEGER,
	"glyph_count"	INTEGER DEFAULT 0,
	"character_count"	INTEGER DEFAULT 0,
	"font_names"	TEXT,
	"font_data_size"	INTEGER NOT NULL DEFAULT 0,
	"path_id"	INTEGER NOT NULL,
	"asset_id"	INTEGER NOT NULL,
	"material_path_id"	INTEGER,
	"atlas_texture_path_id"	INTEGER,
	"create_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	"update_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "font_asset_id_foreign" FOREIGN KEY("asset_id") REFERENCES "assets"("id"),
	UNIQUE("path_id", "asset_id")
);

-- 2) assets_object 表：path_id 只在单个 SerializedFile 内唯一，跨 assets 文件会重复，
--    全局 UNIQUE 会静默丢弃跨文件同 PathId 的对象。重建为复合唯一，id 原样保留。
--    foreign_keys=ON（sqlx 默认）时，DROP 被引用的表会隐式删除其数据行，
--    text_origin(->assets_object)、text_translate(->text_origin) 的 NO ACTION
--    外键会阻止删除；而 PRAGMA foreign_keys 在迁移事务内不可更改。
--    因此先把引用链整链备份进 TEMP 表并清空，使 DROP assets_object 无子行引用，
--    重建完成后按原 id 写回，外键按表名+id 解析自动重新指向新表。
CREATE TEMP TABLE IF NOT EXISTS "_bk_text_origin" AS SELECT * FROM "text_origin";
CREATE TEMP TABLE IF NOT EXISTS "_bk_text_translate" AS SELECT * FROM "text_translate";
-- 先删孙子再删儿子：text_translate 引用 text_origin，text_origin 引用 assets_object
DELETE FROM "text_translate";
DELETE FROM "text_origin";

CREATE TABLE "assets_object_new" (
	"id"	INTEGER NOT NULL UNIQUE,
	"name"	TEXT NOT NULL,
	"type"	TEXT NOT NULL,
	"path_id"	INTEGER NOT NULL,
	"asset_id"	INTEGER NOT NULL,
	"size"	INTEGER NOT NULL,
	"status"	INTEGER NOT NULL DEFAULT 1,
	"line_count"	INTEGER DEFAULT 0,
	"create_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	"update_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	PRIMARY KEY("id" AUTOINCREMENT),
	CONSTRAINT "asset_id_foreign" FOREIGN KEY("asset_id") REFERENCES "assets"("id"),
	UNIQUE("path_id", "asset_id")
);
INSERT OR IGNORE INTO "assets_object_new"
	("id", "name", "type", "path_id", "asset_id", "size", "status", "line_count", "create_time", "update_time")
SELECT
	"id", "name", "type", "path_id", "asset_id", "size", "status", "line_count", "create_time", "update_time"
FROM "assets_object";
DROP TABLE "assets_object";
ALTER TABLE "assets_object_new" RENAME TO "assets_object";

-- 按原 id 写回引用链（TEMP 表列序与原表 SELECT * 一致）
INSERT INTO "text_origin" SELECT * FROM "_bk_text_origin";
INSERT INTO "text_translate" SELECT * FROM "_bk_text_translate";
DROP TABLE IF EXISTS "_bk_text_origin";
DROP TABLE IF EXISTS "_bk_text_translate";
