using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace AssetWorker.Mapper
{
    public class SqliteFactory
    {
        public SqliteConnection Create(string dbPath)
        {
            var csb = new SqliteConnectionStringBuilder
            {
                DataSource = dbPath,
                // sidecar 是常驻进程，默认连接池会让空闲连接一直锁住 gameN.db，
                // Windows 上导致主程序"移除项目"删库失败；复用旧库后 assets.status=2
                // 被 ON CONFLICT DO NOTHING 跳过，表现为重扫提取不到任何 assetobject
                Pooling = false
            };
            return new SqliteConnection(csb.ConnectionString);  // 调用方 using 释放
        }
    }
}