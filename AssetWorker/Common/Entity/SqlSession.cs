using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public class SqlSession
    {
        public string? CurrentDbPath { get; private set; }
        public void Init(string dbPath) => CurrentDbPath = dbPath;
    }
}