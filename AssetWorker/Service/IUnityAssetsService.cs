using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AssetWorker.Common.Dto;

namespace AssetWorker.Service
{
    public interface IUnityAssetsService
    {
        public string Init(InitDTO initDTO);

        /// <summary>
        /// 扫描资源并以事件流形式产出进度，每个元素为 (SSE 事件名, 事件数据)。
        /// 事件：start（开始）、progress（进度）、asset/bundle（发现一项）、done（汇总结果）。
        /// </summary>
        public IAsyncEnumerable<(string Event, object? Data)> ScanAsync(string title, CancellationToken cancellationToken = default);
        public IAsyncEnumerable<(string Event, object? Data)> ExtractAsync(CancellationToken cancellationToken = default);
        public IAsyncEnumerable<(string Event, object? Data)> ViewDataAsync(int Id,CancellationToken cancellationToken = default);
        public void MakePatch(string dir);
        public void PauseScan();
        public void ResumeScan();
        public void PauseExtract();
        public void ResumeExtract();
    }
}