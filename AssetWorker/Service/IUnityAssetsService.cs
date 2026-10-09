using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AssetWorker.Common.Dto;
using AssetWorker.Service.Impl;

namespace AssetWorker.Service
{
    public interface IUnityAssetsService
    {
        public string Init(InitDTO initDTO);

        /// <summary>
        /// 按 assets_object 主键加载 Texture2D 并解码为 PNG 预览。
        /// </summary>
        public Task<TexturePreview> GetTexturePreviewAsync(int id, CancellationToken cancellationToken = default);

        /// <summary>
        /// 将用户上传的 PNG 按 Texture2D 原格式重新编码后存入 texture_patch 表，
        /// 不写文件。制作补丁时（MakePatch）与文本修改一起打包到 SoraTransOutput。
        /// id 为 assets_object 主键，重复导入以 INSERT OR REPLACE 覆盖。
        /// </summary>
        public Task<TextureImportResult> ImportTextureAsync(int id, byte[] pngData, CancellationToken cancellationToken = default);

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