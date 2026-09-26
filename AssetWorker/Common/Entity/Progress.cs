using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public class Progress
    {
        public double Val { get; set; }
        public long Total { get; set; }
        public long Scanned { get; set; }
        public double Elapsed { get; set; }
        public double Remaining { get; set; }
        public long Line { get; set; }
    }
}