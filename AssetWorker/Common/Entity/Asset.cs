using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public class Asset
    {
        public long Id { get; set; }
        public string? Name { get; set; }
        public string? Size { get; set; }
        public string? Path { get; set; }
        public long Status { get; set; }
        public long LineCount { get; set; }
        public string? ParentBundleName { get; set; }
    }
}