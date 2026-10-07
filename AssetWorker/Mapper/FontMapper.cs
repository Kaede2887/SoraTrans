using Dapper;
using AssetWorker.Common.Entity;
using Microsoft.Data.Sqlite;

namespace AssetWorker.Mapper
{
    public class FontMapper
    {
        private readonly SqliteFactory _factory = new();

        private const string InsertFontSql = """
            INSERT OR IGNORE INTO font (
                kind, name, family_name, style_name, version, point_size,
                atlas_width, atlas_height, atlas_padding, atlas_render_mode, population_mode,
                glyph_count, character_count, font_names, font_data_size,
                path_id, asset_id, material_path_id, atlas_texture_path_id
            )
            VALUES (
                @Kind, @Name, @FamilyName, @StyleName, @Version, @PointSize,
                @AtlasWidth, @AtlasHeight, @AtlasPadding, @AtlasRenderMode, @PopulationMode,
                @GlyphCount, @CharacterCount, @FontNames, @FontDataSize,
                @PathId, @AssetId, @MaterialPathId, @AtlasTexturePathId
            )
        """;

        public void InsertFont(string dbPath, FontInfo font)
        {
            using var conn = _factory.Create(dbPath);
            conn.Open();
            conn.Execute(InsertFontSql, font);
        }

        /// <summary>
        /// 复用提取任务的长事务连接写字体记录，避免另开连接产生 SQLite 写锁冲突。
        /// </summary>
        public void InsertFont(SqliteConnection conn, SqliteTransaction tx, FontInfo font)
        {
            conn.Execute(InsertFontSql, font, tx);
        }
    }
}
