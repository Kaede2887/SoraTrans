using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public class SqlSession
    {
        public string? CurrentDbPath { get; private set; }
        public void Init(string dbPath)
        {
            // 切换到新项目库前释放上一项目残留的池化连接，
            // 避免常驻 sidecar 继续锁住已切换走的旧库文件
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            CurrentDbPath = dbPath;
        }
    }
}