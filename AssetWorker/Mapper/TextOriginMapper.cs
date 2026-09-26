using AssetWorker.Common.Entity;
using Dapper;
using Microsoft.Data.Sqlite;

namespace AssetWorker.Mapper
{
    public class TextOriginMapper
    {
        private readonly SqliteFactory _factory = new();

        private readonly string SelectPatternTreeSql = """
            SELECT
                text_pattern.id AS Id,
                text_pattern.semantic AS Semantic,
                COUNT(text_origin.id) AS Count
            FROM text_pattern
            INNER JOIN text_origin
                ON text_origin.pattern_id = text_pattern.id
            WHERE text_origin.object_id = @Id
            GROUP BY
                text_pattern.id,
                text_pattern.semantic;
        """;

        private readonly string SelectMakePatchSql = """
            SELECT
                tt.text AS TransText,
                tor.field_path AS FieldPath,
                ao.path_id AS ObjectPathId,
                a.name AS AssetName,
                a.path AS AssetPath,
                b.name AS BundleName,
                b.path AS BundlePath
            FROM text_translate AS tt
            JOIN text_origin AS tor
                ON tor.id = tt.origin_id
            JOIN assets_object AS ao
                ON ao.id = tor.object_id
            JOIN assets AS a
                ON a.id = ao.asset_id
            LEFT JOIN bundle AS b
                ON b.name = a.parent_bundle_name;
        """;

        public IEnumerable<TextPattern> SelectPatternTree(string dbPath,int id)
        {
            var conn = _factory.Create(dbPath);
            var patterns = conn.Query<TextPattern>(SelectPatternTreeSql, new { Id = id });
            return patterns;
        }

        public IEnumerable<MakePatchInfo> SelectMakePatchInfo(string dbPath)
        {
            var conn = _factory.Create(dbPath);
            var patchList = conn.Query<MakePatchInfo>(SelectMakePatchSql);
            return patchList;
        }
    }
}

