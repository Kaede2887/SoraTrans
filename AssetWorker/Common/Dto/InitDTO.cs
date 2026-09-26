using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Dto
{
    public class InitDTO
    {
        public required string Path { get; set; }
        public required string DbPath { get; set; }
    }
}