using Dapper;
using AssetWorker.Common.Entity;
using Microsoft.Data.Sqlite;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AssetWorker.Mapper
{
    public class AssetObjectMapper
    {
        private readonly SqliteFactory _factory = new();

        /// <summary>
        /// 批量插入资产对象及其文本：单连接 + 单事务，避免逐条提交造成的磁盘 fsync 开销。
        /// 每个对象通过 last_insert_rowid() 取回真实自增主键（Execute 返回的是受影响行数，不是 id）。
        /// INSERT OR IGNORE 命中重复时，按 (path_id, asset_id) 回查已有 id，保证外键仍然正确。
        /// </summary>
        public void InsertAssetObjects(string dbPath, IEnumerable<(AssetObject obj, List<TextOrigin> texts)> items)
        {
            using var inserter = CreateBatchInserter(dbPath);
            foreach (var (obj, texts) in items)
            {
                inserter.Add(obj, texts);
            }
            inserter.Commit();
        }

        /// <summary>
        /// 流式批量插入器：整个提取过程复用一个连接和一个事务，调用方边提取边 Add，
        /// 避免把全部 AssetObject/TextOrigin 堆在内存里到最后一次写入。
        /// 未 Commit 直接 Dispose 会回滚，保证异常时不留半截数据。
        /// </summary>
        public AssetObjectBatchInserter CreateBatchInserter(string dbPath) => new(_factory, dbPath);

        public sealed class AssetObjectBatchInserter : IDisposable
        {
            private readonly SqliteConnection _conn;
            private readonly SqliteTransaction _tx;
            private bool _committed;

            // pattern -> id 的进程内缓存：同一提取任务内重复出现的 pattern（如 m_Components[].data.m_Text）
            // 只查/插库一次，后续直接命中缓存，避免对每条 text_origin 都走 SQL
            private readonly Dictionary<string, long> _patternCache = new();

            private const string InsertObjSql = """
                INSERT OR IGNORE INTO assets_object (name,type,path_id,asset_id,size,line_count)
                VALUES (@Name,@Type,@PathId,@AssetId,@Size,@LineCount)
            """;
            private const string LastIdSql = "SELECT last_insert_rowid();";
            // PathId 只在单个 SerializedFile 内唯一，跨 assets 文件会重复，
            // 必须带 asset_id 复合定位，否则跨文件同 PathId 会把文本挂到别的文件的对象上
            private const string ExistIdSql = "SELECT id FROM assets_object WHERE path_id = @PathId AND asset_id = @AssetId";
            private const string InsertPatternSql = """
                INSERT OR IGNORE INTO text_pattern (pattern, semantic)
                VALUES (@Pattern, @Semantic)
            """;
            private const string SelectPatternIdSql = "SELECT id FROM text_pattern WHERE pattern = @Pattern;";
            private const string InsertTextSql = """
                INSERT OR IGNORE INTO text_origin (object_id, pattern_id, text, field_path)
                VALUES (@ObjectId, @PatternId, @Text, @FieldPath)
            """;

            internal AssetObjectBatchInserter(SqliteFactory factory, string dbPath)
            {
                _conn = factory.Create(dbPath);
                _conn.Open();
                _tx = _conn.BeginTransaction();
            }

            // 供同一提取任务内的其他写操作（如更新 assets 状态）复用，
            // 避免再开连接写库与本长事务发生 SQLite 写锁冲突（database is locked）
            internal SqliteConnection Connection => _conn;
            internal SqliteTransaction Transaction => _tx;

            public void Add(AssetObject obj, List<TextOrigin> texts)
            {
                _conn.Execute(InsertObjSql, obj, _tx);
                long objId = _conn.ExecuteScalar<long>(ExistIdSql, new { obj.PathId, obj.AssetId }, _tx);
                obj.Id = objId;
                try
                {
                    if (texts.Count > 0)
                    {
                        texts.ForEach(t =>
                        {
                            t.ObjectId = objId;
                            t.PatternId = GetOrCreatePatternId(t.FieldPath);
                        });
                        _conn.Execute(InsertTextSql, texts, _tx);
                    }
                }
                catch (Exception err)
                {
                    Console.WriteLine($"add: {err},当前objID: {objId},当前obj:{JsonSerializer.Serialize(obj)}");
                    throw;
                }

            }

            /// <summary>
            /// 按 FieldPath 提取结构 pattern，查/建 text_pattern 行并返回其 id。
            /// semantic 默认填 pattern 本身（即结构签名），后续可由用户手动标注更上层的语义归类。
            /// 同一提取任务内重复出现的 pattern 只查/插库一次，之后命中进程内缓存。
            /// </summary>
            private long GetOrCreatePatternId(string fieldPath)
            {
                string pattern = TextOrigin.ExtractPattern(fieldPath);
                if (_patternCache.TryGetValue(pattern, out long cachedId))
                    return cachedId;
                // pattern 归一化后的数组段形如 ".Array[]"，末级保留了下标的形如 ".Array[1]"，
                // 统一剥掉 ".Array" 让 semantic 可读：importGridList.rows.strings[1]
                string semantic = Regex.Replace(pattern, @"\.Array(?=\[)", "");
                _conn.Execute(InsertPatternSql, new { Pattern = pattern, Semantic = semantic }, _tx);
                long id = _conn.ExecuteScalar<long>(SelectPatternIdSql, new { Pattern = pattern }, _tx);
                _patternCache[pattern] = id;
                return id;
            }

            public void Commit()
            {
                _tx.Commit();
                _committed = true;
            }

            public void Dispose()
            {
                if (!_committed)
                {
                    try { _tx.Rollback(); } catch { }
                }
                _tx.Dispose();
                _conn.Dispose();
            }
        }

        public async Task<ViewDataInfo> SelectViewDataInfo(string dbPath, long id)
        {
            await using var conn = _factory.Create(dbPath);
            string sql = """
                SELECT a.id AS Id, a.name AS AssetName, a.path AS AssetPath,
                b.name AS BundleName, b.path AS BundlePath, ao.path_id AS AssetObjPathId
                FROM assets AS a, assets_object AS ao
                LEFT JOIN bundle AS b
                ON a.parent_bundle_name = b.name
                WHERE ao.id = @Id
                AND a.id = ao.asset_id
            """;
            var viewDataInfos = conn.Query<ViewDataInfo>(sql, new { Id = id });
            return viewDataInfos.FirstOrDefault() ?? new ViewDataInfo() { };
        }
    }
}
