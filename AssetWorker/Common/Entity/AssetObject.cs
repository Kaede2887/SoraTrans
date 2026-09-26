using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public enum FileType
    {
        Assets,
        Bundle,
        Unknown
    }
    public class AssetObject
    {
        public long Id { get; set; }
        public required string Name { get; set; }
        public required string Type { get; set; }
        public long PathId { get; set; }
        public long AssetId { get; set; }
        public long Size { get; set; }
        public long LineCount { get; set; }
    }
}