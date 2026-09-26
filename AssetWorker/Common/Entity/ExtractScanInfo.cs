using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public class ExtractScanInfo
    {
        public List<ExtractInfo>? extractList;
        public required Progress progress;
    }
}