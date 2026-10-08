using AssetsTools.NET;
using AssetsTools.NET.Extra;
using AssetWorker.Common.Entity;

namespace AssetWorker.Service.Impl;

public class AssetWriter(AssetsManager assetsManager)
{
    private readonly AssetsManager manager = assetsManager;

    public void MakeAssetPatch(AssetsFileInstance fileInst, List<MakePatchInfo> list, string outPath)
    {
        var file = fileInst.file;
        manager.LoadClassDatabaseFromPackage(file.Metadata.UnityVersion);
        Dictionary<long, List<MakePatchInfo>> set = [];
        foreach (var item in list)
        {
            if (!set.TryGetValue(item.ObjectPathId, out var idList))
            {
                idList = [];
                set[item.ObjectPathId] = idList;
            }

            idList.Add(item);
        }

        foreach (var item in set)
        {
            var goInfo = file.GetAssetInfo(item.Key);

            if (goInfo == null)
            {
                continue;
            }

            var goBase = manager.GetBaseField(fileInst, goInfo);
            foreach (var info in item.Value)
            {
                var value = GetByPath(goBase, info.FieldPath);

                if (value == null)
                {
                    continue;
                }

                value.AsString = info.TransText;
            }
            goInfo.SetNewData(goBase);
        }

        using var writer = new AssetsFileWriter(outPath);
        fileInst.file.Write(writer);
    }

    public void MakeBundlePatch(BundleFileInstance bunInst, AssetsFileInstance fileInst, List<MakePatchInfo> list, int index, string outPath)
    {
        var bun = bunInst.file;
        var file = fileInst.file;

        manager.LoadClassDatabaseFromPackage(file.Metadata.UnityVersion);

        Dictionary<long, List<MakePatchInfo>> set = [];
        foreach (var item in list)
        {
            if (!set.TryGetValue(item.ObjectPathId, out var idList))
            {
                idList = [];
                set[item.ObjectPathId] = idList;
            }

            idList.Add(item);
        }

        foreach (var item in set)
        {
            var goInfo = file.GetAssetInfo(item.Key);

            if (goInfo == null)
            {
                // TODO: log
                continue;
            }

            var goBase = manager.GetBaseField(fileInst, goInfo);
            foreach (var info in item.Value)
            {
                var value = GetByPath(goBase, info.FieldPath);

                if (value == null)
                {
                    // TODO: log
                    continue;
                }

                value.AsString = info.TransText;
            }
            goInfo.SetNewData(goBase);
        }

        if (index < 0 || index >= bun.BlockAndDirInfo.DirectoryInfos.Count)
        {
            throw new ArgumentOutOfRangeException(nameof(index));
        }

        bun.BlockAndDirInfo.DirectoryInfos[index].SetNewData(file);

        // 重要：Pack 不应用 DirectoryInfo 的 Replacer（SetNewData 设置的修改会被忽略），
        // 必须先用 Write 把修改落到一个未压缩中间文件，再重新加载并 Pack 压缩。
        // 压缩类型按本机对 993MB 解压数据的实测取舍：
        //   LZ4     -> 158.8s -> 104.4MB（原包 LZ4HC 持平，但纯托管实现近 3 分钟，像卡死）
        //   LZ4Fast ->   6.5s -> 134.2MB（原包的 1.27 倍，补丁场景速度优先）
        var tmpUncompressed = outPath + ".uncompressed.tmp";
        try
        {
            using (var w = new AssetsFileWriter(tmpUncompressed))
                bun.Write(w);

            var tmpManager = new AssetsManager();
            var tmpBun = tmpManager.LoadBundleFile(tmpUncompressed, false);
            try
            {
                using AssetsFileWriter writer = new(outPath);
                tmpBun.file.Pack(writer, AssetBundleCompressionType.LZ4Fast, false, new BundleCompressProgress());
            }
            finally
            {
                tmpManager.UnloadAll();
            }
        }
        finally
        {
            if (File.Exists(tmpUncompressed))
                File.Delete(tmpUncompressed);
        }
    }

    /// <summary>
    /// 无操作压缩进度回调。Pack 实现可能不判空直接调用回调，传入 null 有 NRE 风险。
    /// </summary>
    private class BundleCompressProgress : IAssetBundleCompressProgress
    {
        public void SetProgress(float progress) { }
    }

    public static AssetTypeValueField GetByPath(AssetTypeValueField root, string path)
    {
        var current = root;

        var parts = path.Split('.');

        for (int i = 0; i < parts.Length;)
        {
            // xxx
            var key = parts[i];

            // xxx.Array[index]
            if (i + 1 < parts.Length &&
                parts[i + 1].StartsWith("Array["))
            {
                var arrayPart = parts[i + 1];

                int start = arrayPart.IndexOf('[') + 1;
                int end = arrayPart.IndexOf(']');

                if (start <= 0 || end <= start)
                    throw new Exception($"非法数组路径: {arrayPart}");

                if (!int.TryParse(
                        arrayPart[start..end],
                        out var index))
                {
                    throw new Exception($"非法数组索引: {arrayPart}");
                }

                current = current[$"{key}.Array"];


                if (current == null)
                    throw new Exception(
                        $"找不到数组: {key}.Array");

                if (index < 0 || index >= current.Children.Count)
                {
                    throw new Exception(
                        $"数组索引越界: {current.FieldName}[{index}], " +
                        $"Count={current.Children.Count}"
                    );
                }

                current = current.Children[index];

                i += 2;
            }
            else
            {
                // 普通字段，例如 value
                current = current[key];

                i++;
            }
        }

        return current;
    }

    // Unload* 内部按路径匹配（Path.GetFullPath），入口名含非法路径字符（如 archive:/ 中的 ':'）时会抛异常，
    // 这里吞掉以保证扫描/提取流程不中断；卸载失败只是缓存多驻留一项，不影响正确性
    internal static void SafeUnloadAssetsFile(AssetsManager manager, string path)
    {
        try { manager.UnloadAssetsFile(path); } catch { }
    }

    internal static void SafeUnloadBundleFile(AssetsManager manager, string path)
    {
        try { manager.UnloadBundleFile(path); } catch { }
    }

    // 必须优先使用实例重载：UnloadBundleFile(BundleFileInstance) 会对 bundle 内
    // loadedAssetsFiles 的每个 assets 文件调用 UnloadAssetsFile（关闭流并从
    // FileLookup/Files 注销）；而 UnloadBundleFile(string) 只 Close 不注销，
    // 懒加载的依赖文件会成为命中即报错的僵尸缓存条目。
    internal static void SafeUnloadBundleInstance(AssetsManager manager, BundleFileInstance bundle)
    {
        try { manager.UnloadBundleFile(bundle); } catch { }
    }
}



