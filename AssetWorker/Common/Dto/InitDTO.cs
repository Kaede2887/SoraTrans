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
        // 游戏可执行文件名（不含扩展名），用于优先定位 {Title}_Data 目录，
        // 避免多个 *_Data 目录共存时枚举到错误的那个
        public string? Title { get; set; }
    }
}