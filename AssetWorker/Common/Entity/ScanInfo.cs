using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public class ScanInfo
    {
        public List<Asset>? AssetList {get;set;}
        public List<Bundle>? BundleList {get;set;}
    }
}