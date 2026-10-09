using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.CompilerServices;
using AssetsTools.NET.Cpp2IL;
using AssetsTools.NET.Extra;
using AssetWorker.Common.Dto;
using AssetWorker.Common.Entity;
using AssetWorker.Mapper;

namespace AssetWorker.Service.Impl
{
    public class UnityAssetsService : IUnityAssetsService
    {
        private readonly AssetsManager manager = new();
        private readonly SqlSession session = new();
        private readonly AssetMapper assetMapper = new();
        private readonly AssetObjectMapper assetObjectMapper = new();
        private readonly TextOriginMapper textOriginMapper = new();
        private readonly FontMapper fontMapper = new();
        private readonly TexturePatchMapper texturePatchMapper = new();
        private readonly UnityDetectService _unityDetectService;
        private readonly TaskControl _scanControl = new();
        private readonly TaskControl _extractControl = new();
        private string? path;
        public UnityAssetsService()
        {
            _unityDetectService = new UnityDetectService();
        }
        public string Init(InitDTO initDTO)
        {
            // 重新初始化必须先清空上轮会话驻留在 manager 中的全部缓存：
            // UnloadBundleFile(string) 只关闭流、不从 FileLookup 移除条目，上轮懒加载的
            // bundle 内依赖文件会成为"流已关闭但仍被缓存"的僵尸实例，之后按文件名命中缓存
            // 即抛 Cannot access a closed file。UnloadAll 会关闭并注销全部 assets/bundle、
            // 清理模板缓存并释放旧的 MonoTempGenerator（下面会重新赋值新的生成器）。
            manager.UnloadAll(false);
            string classDataPath = Path.Combine(AppContext.BaseDirectory, "classdata.tpk");
            manager.LoadClassPackage(classDataPath);
            var env = _unityDetectService.DetectEnvInfo(initDTO.Path, initDTO.Title);
            session.Init(initDTO.DbPath);
            path = initDTO.Path;
            switch (env.Backend)
            {
                case GameBackend.Mono:
                    manager.MonoTempGenerator = new MonoCecilTempGenerator(env.ManagedPath);
                    break;
                case GameBackend.IL2CPP:
                    manager.MonoTempGenerator = new Cpp2IlTempGenerator(env.MetadataPath, env.GameAssemblyPath);
                    break;
                default:
                    Console.Error.WriteLine("未能识别到有效的 Mono 或 IL2CPP 结构！");
                    break;
            }
            return "Init Success";
        }
        public async IAsyncEnumerable<(string Event, object? Data)> ScanAsync(
            string title, [EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(path))
            {
                throw new InvalidOperationException("path尚未初始化，请先调用 init 接口");
            }

            if (string.IsNullOrEmpty(session.CurrentDbPath))
            {
                throw new InvalidOperationException("session.CurrentDbPath尚未初始化，请先调用 init 接口");
            }

            // 全目录递归枚举可能较慢，放到线程池避免长时间占用请求线程
            var fileList = await Task.Run(() => AssetScanner.FilterFile(path), cancellationToken);
            var extractor = new AssetExtractor(manager);
            yield return ("extract_log", new LogMessage<string>()
            {
                Type = "start",
                Time = DateTime.Now.ToLongTimeString(),
                Log = title == null ? "任务开始处理" : $"开始处理 {title}"
            });

            Stopwatch stopwatch = Stopwatch.StartNew();

            // 新任务启动时清除遗留的暂停位：上轮任务可能在暂停中被窗口关闭取消，
            // TaskControl 是进程级状态，不复位会让新任务在 WaitIfPaused 处永久阻塞
            _scanControl.Resume();

            foreach (var item in AssetScanner.ScanFile(fileList, session.CurrentDbPath))
            {
                cancellationToken.ThrowIfCancellationRequested();

                _scanControl.WaitIfPaused(cancellationToken);

                if (item.Asset != null)
                {
                    yield return ("extract_log", new LogMessage<string>()
                    {
                        Type = "scan",
                        Time = DateTime.Now.ToLongTimeString(),
                        Log = $"扫描发现 文件 {item.Asset.Name}"
                    });
                    yield return ("extract_filelog", new FileLogMessage()
                    {
                        Type = "wait",
                        File = item.Asset.Name
                    });
                }
                if (item.Bundle != null)
                {
                    yield return ("extract_log", new LogMessage<string>()
                    {
                        Type = "scan",
                        Time = DateTime.Now.ToLongTimeString(),
                        Log = $"扫描发现 文件 {item.Bundle.Name}"
                    });

                    // C# 迭代器不允许在 try-catch 内 yield，先用缓冲收集，再在外部统一产出
                    var pending = new List<(string Event, object? Data)>();
                    BundleFileInstance? bundleInst = null;
                    try
                    {
                        bundleInst = manager.LoadBundleFile(item.Bundle.Path);
                        foreach (var file in extractor.ExtractBundle(session.CurrentDbPath, bundleInst))
                        {
                            if (file.Bundle != null)
                            {
                                pending.Add(("extract_log", new LogMessage<string>()
                                {
                                    Type = "scan",
                                    Time = DateTime.Now.ToLongTimeString(),
                                    Log = $"扫描发现 文件 {file.Bundle.Name}"
                                }));
                            }
                            if (file.Asset != null)
                            {
                                pending.Add(("extract_log", new LogMessage<string>()
                                {
                                    Type = "scan",
                                    Time = DateTime.Now.ToLongTimeString(),
                                    Log = $"扫描发现 文件 {file.Asset.Name}"
                                }));
                                pending.Add(("extract_filelog", new FileLogMessage()
                                {
                                    Type = "wait",
                                    File = file.Asset.Name
                                }));
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        // manager 解析不了该 bundle 时跳过，继续处理下一个文件，
                        // 避免单个损坏资源导致整轮扫描中断
                        pending.Add(("extract_log", new LogMessage<string>()
                        {
                            Type = "scan",
                            Time = DateTime.Now.ToLongTimeString(),
                            Log = $"跳过无法解析的文件 {item.Bundle.Name}: {ex.Message}"
                        }));
                    }
                    finally
                    {
                        if (bundleInst != null)
                            AssetExtractor.SafeUnloadBundleInstance(manager, bundleInst);
                    }
                    foreach (var evt in pending)
                        yield return evt;
                }


            }

            var count = await assetMapper.SelectFileCount(session.CurrentDbPath);

            // 扫描阶段加载/解压过大量 bundle，全部卸载后主动回收，避免 LOH 大缓冲继续占用内存
            GC.Collect();
            GC.WaitForPendingFinalizers();

            yield return ("scan", count);

            stopwatch.Stop();
        }

        public async IAsyncEnumerable<(string Event, object? Data)> ExtractAsync(
            [EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(path))
            {
                throw new InvalidOperationException("path尚未初始化，请先调用 init 接口");
            }

            if (string.IsNullOrEmpty(session.CurrentDbPath))
            {
                throw new InvalidOperationException("CurrentDbPath尚未初始化，请先调用 init 接口");
            }
            var res = await assetMapper.SelectExtractInfo(session.CurrentDbPath);
            var stopwatch = Stopwatch.StartNew();
            var total = res.progress.Total;
            var scanned = res.progress.Scanned;
            var line = res.progress.Line;
            AssetExtractor extractor = new(manager);

            if (res.extractList == null) throw new InvalidOperationException("extractList为空");

            // 新任务启动时清除遗留的暂停位：上轮任务可能在暂停中被窗口关闭取消，
            // 不复位会让新任务在 WaitIfPaused 处永久阻塞
            _extractControl.Resume();

            // 流式写库：单事务复用，提取结果不再全量堆积在内存
            using var inserter = assetObjectMapper.CreateBatchInserter(session.CurrentDbPath);
            // 当前驻留在 manager 缓存中的 bundle：切换到别的 bundle 时卸载旧的。
            // 必须持有实例：UnloadBundleFile(instance) 才会连带注销 bundle 内懒加载的
            // 依赖 assets 文件，字符串重载只关流不注销，会残留 closed file 僵尸条目
            BundleFileInstance? loadedBundle = null;
            try
            {
                foreach (var item in res.extractList)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    _extractControl.WaitIfPaused(cancellationToken);

                    if (item.BundleName != null)
                    {
                        var fileCount = 0;
                        var success = false;
                        if (loadedBundle != null && loadedBundle.path != item.BundlePath)
                        {
                            AssetExtractor.SafeUnloadBundleInstance(manager, loadedBundle);
                            loadedBundle = null;
                        }
                        // C# 迭代器不允许在 try-catch 内 yield，先用缓冲收集，再在外部统一产出
                        var pending = new List<(string Event, object? Data)>();
                        BundleFileInstance? bunInst = null;
                        AssetsFileInstance? fileInst = null;
                        try
                        {
                            bunInst = manager.LoadBundleFile(item.BundlePath);
                            loadedBundle = bunInst;
                            var AssetIndex = bunInst.file.GetFileIndex(item.AssetName);
                            fileInst = manager.LoadAssetsFileFromBundle(bunInst, AssetIndex, false);
                            foreach (var extractItem in extractor.ExtractAsset(session.CurrentDbPath, fileInst, item))
                            {
                                switch (extractItem.type)
                                {
                                    case "analyze":
                                        pending.Add(("extract_log", new LogMessage<string>()
                                        {
                                            Type = "analyze",
                                            Time = DateTime.Now.ToLongTimeString(),
                                            Log = $"分析文件 {extractItem.val}"
                                        }));
                                        break;
                                    case "handle":
                                        pending.Add(("extract_filelog", new FileLogMessage()
                                        {
                                            Type = "handle",
                                            File = (string?)extractItem.val
                                        }));
                                        break;
                                    case "discover":
                                        line += int.TryParse(extractItem.val?.ToString(), out var lineCount) ? lineCount : 0;
                                        fileCount += int.TryParse(extractItem.val?.ToString(), out var val) ? val : 0;
                                        pending.Add(("extract_log", new LogMessage<string>()
                                        {
                                            Type = "discover",
                                            Time = DateTime.Now.ToLongTimeString(),
                                            Log = $"发现 {extractItem.val} 行文本"
                                        }));
                                        break;
                                    case "resource":
                                        if (extractItem.val is ObjWithText obj)
                                            inserter.Add(obj.obj, obj.list);
                                        break;
                                    case "font":
                                        if (extractItem.val is FontInfo font)
                                        {
                                            try
                                            {
                                                fontMapper.InsertFont(inserter.Connection, inserter.Transaction, font);
                                                pending.Add(("extract_log", new LogMessage<string>()
                                                {
                                                    Type = "analyze",
                                                    Time = DateTime.Now.ToLongTimeString(),
                                                    Log = $"发现 {font.Kind} 字体 {font.Name}（{font.GlyphCount} 字形，图集 {font.AtlasWidth}x{font.AtlasHeight}）"
                                                }));
                                            }
                                            catch (Exception fontEx)
                                            {
                                                // 字体入库失败（如 font 表尚未迁移）不能抛出 foreach：
                                                // 否则 ExtractAsset 迭代器被 Dispose，该 assets 文件中
                                                // 排在字体之后的全部文本对象都会丢失
                                                pending.Add(("extract_log", new LogMessage<string>()
                                                {
                                                    Type = "analyze",
                                                    Time = DateTime.Now.ToLongTimeString(),
                                                    Log = $"字体记录入库失败 {font.Name}: {fontEx.Message}"
                                                }));
                                            }
                                        }
                                        break;
                                    default:
                                        break;
                                }
                            }
                            success = true;
                        }
                        catch (Exception ex)
                        {
                            // manager 解析不了该资源时跳过，继续处理下一个，
                            // 避免单个损坏资源导致整轮提取中断
                            pending.Add(("extract_log", new LogMessage<string>()
                            {
                                Type = "analyze",
                                Time = DateTime.Now.ToLongTimeString(),
                                Log = $"跳过无法解析的资源 {item.AssetName}: {ex.Message}"
                            }));
                        }
                        finally
                        {
                            if (fileInst != null)
                                AssetExtractor.SafeUnloadAssetsFile(manager, fileInst.path);
                        }
                        foreach (var evt in pending)
                            yield return evt;
                        scanned++;
                        double elapsed = stopwatch.Elapsed.TotalSeconds;
                        double speed = scanned / elapsed;
                        double remaining = total > scanned
                                ? Math.Ceiling((total - scanned) / speed)
                                : 0;
                        var progress = new Progress()
                        {
                            Val = total > 0 ? scanned * 100.0 / total : 0,
                            Total = total,
                            Scanned = scanned,
                            Elapsed = elapsed,
                            Remaining = remaining,
                            Line = line
                        };
                        yield return ("extract_filelog", new FileLogMessage()
                        {
                            Type = success ? "completed" : "failed",
                            File = item.AssetName
                        });
                        if (success)
                            assetMapper.UpdateAssetInfoStatus(inserter.Connection, inserter.Transaction, item.Id, 2, fileCount);
                        yield return ("extract_log", new LogMessage<Progress>()
                        {
                            Type = "progress",
                            Time = DateTime.Now.ToLongTimeString(),
                            Log = progress
                        });
                    }
                    else
                    {
                        var fileCount = 0;
                        var success = false;
                        // C# 迭代器不允许在 try-catch 内 yield，先用缓冲收集，再在外部统一产出
                        var pending = new List<(string Event, object? Data)>();
                        AssetsFileInstance? fileInst = null;
                        try
                        {
                            fileInst = manager.LoadAssetsFile(item.AssetPath, true);
                            foreach (var extractItem in extractor.ExtractAsset(session.CurrentDbPath, fileInst, item))
                            {
                                switch (extractItem.type)
                                {
                                    case "analyze":
                                        pending.Add(("extract_log", new LogMessage<string>()
                                        {
                                            Type = "analyze",
                                            Time = DateTime.Now.ToLongTimeString(),
                                            Log = $"分析文件 {extractItem.val}"
                                        }));
                                        break;
                                    case "handle":
                                        pending.Add(("extract_filelog", new FileLogMessage()
                                        {
                                            Type = "handle",
                                            File = (string?)extractItem.val
                                        }));
                                        break;
                                    case "discover":
                                        line += int.TryParse(extractItem.val?.ToString(), out var lineCount) ? lineCount : 0;
                                        fileCount += int.TryParse(extractItem.val?.ToString(), out var val) ? val : 0;
                                        pending.Add(("extract_log", new LogMessage<string>()
                                        {
                                            Type = "discover",
                                            Time = DateTime.Now.ToLongTimeString(),
                                            Log = $"发现 {extractItem.val} 行文本"
                                        }));
                                        break;
                                    case "resource":
                                        if (extractItem.val is ObjWithText obj)
                                            inserter.Add(obj.obj, obj.list);
                                        break;
                                    case "font":
                                        if (extractItem.val is FontInfo font)
                                        {
                                            try
                                            {
                                                fontMapper.InsertFont(inserter.Connection, inserter.Transaction, font);
                                                pending.Add(("extract_log", new LogMessage<string>()
                                                {
                                                    Type = "analyze",
                                                    Time = DateTime.Now.ToLongTimeString(),
                                                    Log = $"发现 {font.Kind} 字体 {font.Name}（{font.GlyphCount} 字形，图集 {font.AtlasWidth}x{font.AtlasHeight}）"
                                                }));
                                            }
                                            catch (Exception fontEx)
                                            {
                                                // 字体入库失败（如 font 表尚未迁移）不能抛出 foreach：
                                                // 否则 ExtractAsset 迭代器被 Dispose，该 assets 文件中
                                                // 排在字体之后的全部文本对象都会丢失
                                                pending.Add(("extract_log", new LogMessage<string>()
                                                {
                                                    Type = "analyze",
                                                    Time = DateTime.Now.ToLongTimeString(),
                                                    Log = $"字体记录入库失败 {font.Name}: {fontEx.Message}"
                                                }));
                                            }
                                        }
                                        break;
                                    default:
                                        break;
                                }
                            }
                            success = true;
                        }
                        catch (Exception ex)
                        {
                            // manager 解析不了该资源时跳过，继续处理下一个，
                            // 避免单个损坏资源导致整轮提取中断
                            pending.Add(("extract_log", new LogMessage<string>()
                            {
                                Type = "analyze",
                                Time = DateTime.Now.ToLongTimeString(),
                                Log = $"跳过无法解析的资源 {item.AssetName}: {ex.Message}"
                            }));
                        }
                        finally
                        {
                            if (fileInst != null)
                                AssetExtractor.SafeUnloadAssetsFile(manager, fileInst.path);
                        }
                        foreach (var evt in pending)
                            yield return evt;
                        scanned++;
                        double elapsed = stopwatch.Elapsed.TotalSeconds;
                        double speed = scanned / elapsed;
                        double remaining = total > scanned
                                ? Math.Ceiling((total - scanned) / speed)
                                : 0;
                        var progress = new Progress()
                        {
                            Val = total > 0 ? scanned * 100.0 / total : 0,
                            Total = total,
                            Scanned = scanned,
                            Elapsed = elapsed,
                            Remaining = remaining,
                            Line = line
                        };
                        yield return ("extract_filelog", new FileLogMessage()
                        {
                            Type = success ? "completed" : "failed",
                            File = item.AssetName
                        });
                        if (success)
                            assetMapper.UpdateAssetInfoStatus(inserter.Connection, inserter.Transaction, item.Id, 2, fileCount);
                        yield return ("extract_log", new LogMessage<Progress>()
                        {
                            Type = "progress",
                            Time = DateTime.Now.ToLongTimeString(),
                            Log = progress
                        });
                    }
                }
                inserter.Commit();
            }
            finally
            {
                // 兜底卸载最后一个驻留 bundle（取消/异常时同样执行）；
                // 实例重载会一并注销 bundle 内懒加载的依赖 assets 文件
                if (loadedBundle != null)
                    AssetExtractor.SafeUnloadBundleInstance(manager, loadedBundle);
                // 批量任务释放的多为 LOH 大缓冲（bundle 解压数据/字段树），主动回收尽快归还内存
                GC.Collect();
                GC.WaitForPendingFinalizers();
            }
        }
        public async IAsyncEnumerable<(string Event, object? Data)> ViewDataAsync(
            int Id, [EnumeratorCancellation] CancellationToken cancellationToken = default
        )
        {
            if (string.IsNullOrEmpty(session.CurrentDbPath))
            {
                throw new InvalidOperationException("session.CurrentDbPath尚未初始化，请先调用 init 接口");
            }
            AssetDataViewer dataViewer = new(manager);
            var info = await assetObjectMapper.SelectViewDataInfo(session.CurrentDbPath, Id) ?? throw new InvalidOperationException("输入Id查询不到对应数据");
            if (info.BundlePath != null)
            {
                BundleFileInstance? bunInst = null;
                try
                {
                    bunInst = manager.LoadBundleFile(info.BundlePath);
                    var bunIndex = bunInst.file.GetFileIndex(info.AssetName);
                    var assetInst = manager.LoadAssetsFileFromBundle(bunInst, bunIndex);
                    foreach (var item in dataViewer.LoadComponent(assetInst, info.AssetObjPathId))
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        yield return ("view_node", item);
                    }
                }
                finally
                {
                    // 实例重载会卸载 bundle 内挂载的全部 assets 文件（主文件 + 解析
                    // m_Script 时懒加载的依赖），防止依赖文件在 FileLookup 中残留僵尸条目
                    if (bunInst != null)
                        AssetExtractor.SafeUnloadBundleInstance(manager, bunInst);
                }
            }
            else
            {
                AssetsFileInstance? assetInst = null;
                try
                {
                    assetInst = manager.LoadAssetsFile(info.AssetPath);
                    foreach (var item in dataViewer.LoadComponent(assetInst, info.AssetObjPathId))
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        yield return ("view_node", item);
                    }
                }
                finally
                {
                    if (assetInst != null)
                        AssetExtractor.SafeUnloadAssetsFile(manager, assetInst.path);
                }
            }
        }

        public async Task<TexturePreview> GetTexturePreviewAsync(
            int id, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(session.CurrentDbPath))
            {
                throw new InvalidOperationException("session.CurrentDbPath尚未初始化，请先调用 init 接口");
            }

            var info = await assetObjectMapper.SelectViewDataInfo(session.CurrentDbPath, id)
                ?? throw new InvalidOperationException("输入Id查询不到对应数据");

            TexturePreviewer previewer = new(manager);

            if (info.BundlePath != null)
            {
                BundleFileInstance? bunInst = null;
                try
                {
                    bunInst = manager.LoadBundleFile(info.BundlePath);
                    var bunIndex = bunInst.file.GetFileIndex(info.AssetName);
                    var assetInst = manager.LoadAssetsFileFromBundle(bunInst, bunIndex);
                    cancellationToken.ThrowIfCancellationRequested();
                    return previewer.DecodeToPng(assetInst, info.AssetObjPathId);
                }
                finally
                {
                    // 与 ViewDataAsync 一致：实例重载连带注销 bundle 内懒加载的依赖 assets 文件
                    if (bunInst != null)
                        AssetExtractor.SafeUnloadBundleInstance(manager, bunInst);
                }
            }
            else
            {
                AssetsFileInstance? assetInst = null;
                try
                {
                    assetInst = manager.LoadAssetsFile(info.AssetPath);
                    cancellationToken.ThrowIfCancellationRequested();
                    return previewer.DecodeToPng(assetInst, info.AssetObjPathId);
                }
                finally
                {
                    if (assetInst != null)
                        AssetExtractor.SafeUnloadAssetsFile(manager, assetInst.path);
                }
            }
        }

        public async Task<TextureImportResult> ImportTextureAsync(
            int id, byte[] pngData, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(session.CurrentDbPath))
            {
                throw new InvalidOperationException(
                    "session.CurrentDbPath尚未初始化，请先调用 init 接口");
            }

            var info = await assetObjectMapper.SelectViewDataInfo(session.CurrentDbPath, id)
                ?? throw new InvalidOperationException("输入Id查询不到对应数据");

            TexturePreviewer previewer = new(manager);

            // 导入 = 编码 + 存库：不写文件，制作补丁时再打包
            if (info.BundlePath != null)
            {
                BundleFileInstance? bunInst = null;
                try
                {
                    bunInst = manager.LoadBundleFile(info.BundlePath, true);
                    var bunIndex = bunInst.file.GetFileIndex(info.AssetName);
                    var fileInst = manager.LoadAssetsFileFromBundle(bunInst, bunIndex, true);
                    cancellationToken.ThrowIfCancellationRequested();

                    // EncodePngToTextureData 只做编码，不调 WriteTo/SetNewData
                    var encoded = previewer.EncodePngToTextureData(fileInst, info.AssetObjPathId, pngData);

                    texturePatchMapper.Upsert(session.CurrentDbPath, new TexturePatchInfo
                    {
                        Id = id,
                        PictureData = encoded.PictureData,
                        Width = encoded.Width,
                        Height = encoded.Height,
                        TextureFormat = encoded.TextureFormat,
                        // 定位字段存库时不需要，MakePatch 时由 JOIN 填充
                        AssetName = info.AssetName ?? "",
                        AssetPath = info.AssetPath ?? "",
                        BundleName = info.BundleName,
                        BundlePath = info.BundlePath,
                    });

                    return new TextureImportResult(encoded.Width, encoded.Height, encoded.TextureFormat);
                }
                finally
                {
                    if (bunInst != null)
                        AssetExtractor.SafeUnloadBundleInstance(manager, bunInst);
                }
            }
            else
            {
                AssetsFileInstance? fileInst = null;
                try
                {
                    fileInst = manager.LoadAssetsFile(info.AssetPath, true);
                    cancellationToken.ThrowIfCancellationRequested();

                    var encoded = previewer.EncodePngToTextureData(fileInst, info.AssetObjPathId, pngData);

                    texturePatchMapper.Upsert(session.CurrentDbPath, new TexturePatchInfo
                    {
                        Id = id,
                        PictureData = encoded.PictureData,
                        Width = encoded.Width,
                        Height = encoded.Height,
                        TextureFormat = encoded.TextureFormat,
                        AssetName = info.AssetName ?? "",
                        AssetPath = info.AssetPath ?? "",
                        BundleName = info.BundleName,
                        BundlePath = info.BundlePath,
                    });

                    return new TextureImportResult(encoded.Width, encoded.Height, encoded.TextureFormat);
                }
                finally
                {
                    if (fileInst != null)
                        AssetExtractor.SafeUnloadAssetsFile(manager, fileInst.path);
                }
            }
        }

        public void MakePatch(string dir)
        {
            if (string.IsNullOrEmpty(session.CurrentDbPath))
            {
                throw new InvalidOperationException(
                    "CurrentDbPath尚未初始化，请先调用 init 接口");
            }

            try
            {
                // 固定写入用户所选目录下的 SoraTransOutput 子目录：
                // 扫描会按目录名整棵排除，允许用户把导出位置选在游戏目录内
                var outDir = Path.Combine(dir, AssetScanner.OutputFolderName);
                Directory.CreateDirectory(outDir);

                var assetWriter = new AssetWriter(manager);

                // 文本补丁 + 纹理补丁一起查出来，按 assetPath/bundleName 分组
                var textList = textOriginMapper
                    .SelectMakePatchInfo(session.CurrentDbPath)
                    .ToList();
                var textureList = texturePatchMapper
                    .SelectMakePatchInfo(session.CurrentDbPath)
                    .ToList();

                // loose assets 文件按 AssetPath 分组；bundle 内 assets 按 AssetName 分组
                Dictionary<string, List<MakePatchInfo>> assetTextSet = [];
                Dictionary<string, List<MakePatchInfo>> bundleTextSet = [];
                Dictionary<string, List<TexturePatchInfo>> assetTextureSet = [];
                Dictionary<string, List<TexturePatchInfo>> bundleTextureSet = [];

                foreach (var info in textList)
                {
                    if (string.IsNullOrEmpty(info.BundleName))
                    {
                        if (!assetTextSet.TryGetValue(info.AssetPath, out var infoList))
                        {
                            infoList = [];
                            assetTextSet[info.AssetPath] = infoList;
                        }
                        infoList.Add(info);
                    }
                    else
                    {
                        if (!bundleTextSet.TryGetValue(info.AssetName, out var infoList))
                        {
                            infoList = [];
                            bundleTextSet[info.AssetName] = infoList;
                        }
                        infoList.Add(info);
                    }
                }

                foreach (var tex in textureList)
                {
                    if (string.IsNullOrEmpty(tex.BundleName))
                    {
                        if (!assetTextureSet.TryGetValue(tex.AssetPath, out var texList))
                        {
                            texList = [];
                            assetTextureSet[tex.AssetPath] = texList;
                        }
                        texList.Add(tex);
                    }
                    else
                    {
                        if (!bundleTextureSet.TryGetValue(tex.AssetName, out var texList))
                        {
                            texList = [];
                            bundleTextureSet[tex.AssetName] = texList;
                        }
                        texList.Add(tex);
                    }
                }

                // 合并键：有文本或纹理补丁任一的 assets 文件都要处理
                foreach (var key in assetTextSet.Keys.Union(assetTextureSet.Keys))
                {
                    AssetsFileInstance? fileInst = null;
                    var texts = assetTextSet.GetValueOrDefault(key) ?? [];
                    var textures = assetTextureSet.GetValueOrDefault(key) ?? [];
                    // 取第一条记录的 AssetName 做输出文件名（同 key 下一致）
                    var assetName = texts.Count > 0 ? texts[0].AssetName : textures[0].AssetName;
                    var tmpPath = Path.Combine(outDir, assetName + ".tmp");
                    var outPath = Path.Combine(outDir, assetName);
                    try
                    {
                        fileInst = manager.LoadAssetsFile(key, true);
                        assetWriter.MakeAssetPatch(fileInst, texts, textures, tmpPath);
                        File.Move(tmpPath, outPath, true);
                    }
                    finally
                    {
                        // 写完即卸载，避免几十个资源文件同时驻留 manager 造成内存峰值；
                        // tmp 移动成功后已不存在，仅在写补丁/移动失败时清理残留
                        if (fileInst != null)
                            AssetExtractor.SafeUnloadAssetsFile(manager, fileInst.path);
                        if (File.Exists(tmpPath))
                            File.Delete(tmpPath);
                    }
                }

                // 按 BundlePath 分组：同一 bundle 的多个 assets 文件必须一次性处理，
                // 各自独立加载+写入会互相覆盖，只有最后一个 assets 文件的补丁会保留。
                // 参考 UABEA 的 save-twice 模式：先在所有 assets 文件上 SetNewData，再统一写 bundle。
                var bundleGroups = new Dictionary<string, List<string>>();
                foreach (var key in bundleTextSet.Keys.Union(bundleTextureSet.Keys))
                {
                    var firstText = bundleTextSet.GetValueOrDefault(key)?.FirstOrDefault();
                    var firstTex = bundleTextureSet.GetValueOrDefault(key)?.FirstOrDefault();
                    var bundlePath = firstText?.BundlePath ?? firstTex?.BundlePath ?? "";
                    if (string.IsNullOrEmpty(bundlePath)) continue;
                    if (!bundleGroups.TryGetValue(bundlePath, out var assetNames))
                    {
                        assetNames = [];
                        bundleGroups[bundlePath] = assetNames;
                    }
                    assetNames.Add(key);
                }

                foreach (var (bundlePath, assetNames) in bundleGroups)
                {
                    BundleFileInstance? bunInst = null;
                    var tmpPath = "";
                    try
                    {
                        bunInst = manager.LoadBundleFile(bundlePath, true);
                        // 取第一条记录的 BundleName 做输出文件名
                        var firstKey = assetNames[0];
                        var firstText = bundleTextSet.GetValueOrDefault(firstKey)?.FirstOrDefault();
                        var firstTex = bundleTextureSet.GetValueOrDefault(firstKey)?.FirstOrDefault();
                        var bundleName = firstText?.BundleName ?? firstTex?.BundleName ?? "";
                        tmpPath = Path.Combine(outDir, bundleName + ".tmp");
                        var outPath = Path.Combine(outDir, bundleName);

                        // 对同一 bundle 的每个 assets 文件应用补丁（不写磁盘）
                        foreach (var assetName in assetNames)
                        {
                            var texts = bundleTextSet.GetValueOrDefault(assetName) ?? [];
                            var textures = bundleTextureSet.GetValueOrDefault(assetName) ?? [];
                            var index = bunInst.file.GetFileIndex(assetName);
                            var fileInst = manager.LoadAssetsFileFromBundle(bunInst, index, true);
                            assetWriter.ApplyBundlePatches(bunInst, fileInst, texts, textures, index);
                        }

                        // 所有 assets 文件补丁应用完毕，统一写 bundle
                        assetWriter.WriteBundle(bunInst, tmpPath);
                        File.Move(tmpPath, outPath, true);
                    }
                    finally
                    {
                        if (bunInst != null)
                            AssetExtractor.SafeUnloadBundleInstance(manager, bunInst);
                        if (!string.IsNullOrEmpty(tmpPath) && File.Exists(tmpPath))
                            File.Delete(tmpPath);
                    }
                }
            }
            finally
            {
                manager.UnloadAll();
                GC.Collect();
                GC.WaitForPendingFinalizers();
            }
        }

        public void PauseScan()
        {
            _scanControl.Pause();
        }

        public void ResumeScan()
        {
            _scanControl.Resume();
        }

        public void PauseExtract()
        {
            _extractControl.Pause();
        }

        public void ResumeExtract()
        {
            _extractControl.Resume();
        }
    }
}
