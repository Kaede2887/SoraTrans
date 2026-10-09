-- 纹理导入补丁表：用户上传 PNG 后按原 Texture2D 格式重新编码，
-- 将编码后的 picture_data 内嵌存库，制作补丁时与文本修改一起打包到 SoraTransOutput。
-- id 直接使用 assets_object.id（一对一），INSERT OR REPLACE 实现覆盖更新。
-- 不需要存 m_StreamData：导入后纹理数据内嵌到 pictureData，不再依赖 .resS。
CREATE TABLE IF NOT EXISTS "texture_patch" (
	"id"	INTEGER NOT NULL,
	"picture_data"	BLOB NOT NULL,
	"width"	INTEGER NOT NULL,
	"height"	INTEGER NOT NULL,
	"texture_format"	INTEGER NOT NULL,
	"create_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	"update_time"	TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	PRIMARY KEY("id"),
	CONSTRAINT "texture_object_id_foreign" FOREIGN KEY("id") REFERENCES "assets_object"("id") ON DELETE CASCADE
);
