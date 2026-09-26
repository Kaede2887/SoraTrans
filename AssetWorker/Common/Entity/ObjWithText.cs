using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public class ObjWithText
    {
        public required AssetObject obj {get;set;} 
        public required List<TextOrigin> list {get;set;} 
    }
}