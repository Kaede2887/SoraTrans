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
            var csb = new SqliteConnectionStringBuilder { DataSource = dbPath };
            return new SqliteConnection(csb.ConnectionString);  // 调用方 using 释放
        }
    }
}