using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AssetWorker.Common.Entity;
using Dapper;

namespace AssetWorker.Mapper
{
    public class BundleMapper
    {
        private readonly SqliteFactory _factory = new();
        public void InsertBundle(string dbPath,Bundle bundle){
            using var conn = _factory.Create(dbPath);
            var sql = """
                INSERT OR IGNORE INTO bundle (name,size,path,parent_bundle_name)
                VALUES (@Name,@Size,@Path,@ParentBundleName)
                ON CONFLICT(name) DO NOTHING;
            """;
            conn.Execute(sql,bundle);
        }
    }
}