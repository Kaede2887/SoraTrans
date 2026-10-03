using Dapper;
using AssetWorker.Common.Entity;
using Microsoft.Data.Sqlite;

namespace AssetWorker.Mapper
{
    public class AssetMapper
    {
        private readonly SqliteFactory _factory = new();
        public void InsertAsset(string dbPath, Asset asset)
        {
            using var conn = _factory.Create(dbPath);
            string sql = """
                INSERT OR IGNORE INTO assets (name,size,path,parent_bundle_name)
                VALUES (@Name,@Size,@Path,@ParentBundleName)
                ON CONFLICT(path) DO NOTHING;
            """;
            conn.Execute(sql, asset);
        }

        public async Task<ExtractScanInfo> SelectExtractInfo(string dbPath)
        {
            await using var conn = _factory.Create(dbPath);
            string progressSql = """
                SELECT COUNT(*) AS Total,
                SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS Scanned,
                SUM(line_count) AS Line
                FROM assets 
            """;
            var progress = conn.Query<Progress>(progressSql);
            string extractSql = """
                    SELECT a.id AS Id, a.name AS AssetName, a.path AS AssetPath,
                    b.name AS BundleName, b.path AS BundlePath
                    FROM assets AS a
                    LEFT JOIN bundle AS b
                    ON a.parent_bundle_name = b.name
                    WHERE a.status != 2 
            """;
            var extractInfo = conn.Query<ExtractInfo>(extractSql);
            var res = new ExtractScanInfo()
            {
                progress = progress.FirstOrDefault() ?? new Progress { Total = 0, Scanned = 0, Line = 0 },
                extractList = extractInfo.ToList()
            };
            conn.Close();
            return res;
        }

        public async Task<string> SelectFileCount(string dbPath)
        {
            await using var conn = _factory.Create(dbPath);
            string sql = """
                    SELECT COUNT(id) as Count FROM assets
                """;
            var count = conn.Query<string>(sql);
            conn.Close();
            return count.FirstOrDefault() ?? "";
        }

        /// <summary>
        /// 复用提取任务已打开的连接/事务更新状态，避免另开连接与长写事务冲突（database is locked）。
        /// </summary>
        public void UpdateAssetInfoStatus(SqliteConnection conn, SqliteTransaction tx,
            long id, long status, long lineCount)
        {
            string sql = """
                UPDATE assets SET status = @Status, line_count = @LineCount WHERE id = @Id
            """;
            conn.Execute(sql, new { Status = status, LineCount = lineCount, Id = id }, tx);
        }
    }
}