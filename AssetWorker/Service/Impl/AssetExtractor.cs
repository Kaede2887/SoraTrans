using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using AssetsTools.NET;
using AssetsTools.NET.Extra;
using AssetWorker.Common.Entity;
using AssetWorker.Mapper;
using Mono.Cecil.Cil;

namespace AssetWorker.Service.Impl
{
    public class AssetExtractor(AssetsManager assetsManager)
    {
        private readonly AssetsManager manager = assetsManager;
        private readonly AssetMapper assetMapper = new();
        private readonly BundleMapper bundleMapper = new();
        private readonly TextOriginMapper textOriginMapper = new();
        private readonly AssetObjectMapper assetObjectMapper = new();
        private const long LargeFileThreshold = 256 * 1024 * 1024;
        private static readonly Regex FindRegex = new("[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff]");

        public IEnumerable<FileScanEvent> ExtractBundle(string dbPath, BundleFileInstance bunInst)
        {
            var file = bunInst.file;
            var reader = file.DataReader;
            var fileNames = file.GetAllFileNames();
            for (int i = 0; i < fileNames.Count; i++)
            {
                string fileName = fileNames[i];
                file.GetFileRange(i, out long offset, out long size);
                FileType type;
                byte[]? fileData = null;
                if (size <= LargeFileThreshold)
                {
                    fileData = BundleHelper.LoadAssetDataFromBundle(file, i);
                    using MemoryStream ms = new(fileData);
                    using AssetsFileReader r = new(ms);
                    type = AssetFileReader.DetectFileType(r, 0);
                }
                else
                {
                    reader.BaseStream.Position = offset;
                    byte[] header = new byte[32];
                    _ = reader.BaseStream.Read(header, 0, 32);
                    using MemoryStream ms = new(header);
                    using AssetsFileReader r = new(ms);
                    type = AssetFileReader.DetectFileType(r, 0);
                }

                Asset? asset = null;
                Bundle? bundle = null;

                switch (type)
                {
                    case FileType.Assets:
                        AssetsFileInstance? assetsInst = null;
                        try
                        {
                            assetsInst = manager.LoadAssetsFileFromBundle(bunInst, i, false);
                            if (assetsInst != null)
                            {
                                asset = new Asset()
                                {
                                    Name = fileName,
                                    Size = (assetsInst.file.Header.FileSize / (1024.0 * 1024)).ToString("0.00"),
                                    Path = assetsInst.path,
                                    ParentBundleName = bunInst.name
                                };
                                assetMapper.InsertAsset(dbPath, asset);
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine($"[Skip] Assets {fileName}: {ex.Message}");
                        }
                        finally
                        {
                            // 用完即卸：从 manager 缓存移除该 assets 文件，否则全部驻留到进程结束
                            if (assetsInst != null)
                                SafeUnloadAssetsFile(manager, assetsInst.path);
                        }
                        break;

                    case FileType.Bundle:
                        BundleFileInstance? nestedBunInst = null;
                        string nestedPath = Path.Combine(bunInst.path, fileName);
                        try
                        {
                            byte[] bundleData = fileData ?? BundleHelper.LoadAssetDataFromBundle(file, i);
                            using MemoryStream ms = new(bundleData);
                            // 以父 bundle 路径合成唯一的根路径：保证 UnloadBundleFile 按路径能匹配到该实例，
                            // 也避免不同 bundle 内同名入口在缓存中互相顶替
                            nestedBunInst = manager.LoadBundleFile(ms, nestedPath, false);
                            if (nestedBunInst != null)
                            {
                                bundle = new Bundle()
                                {
                                    Name = nestedBunInst.name,
                                    Size = (bundleData.Length / (1024.0 * 1024)).ToString("0.00"),
                                    Path = fileName,
                                    ParentBundleName = bunInst.name,
                                };
                                bundleMapper.InsertBundle(dbPath, bundle);
                                // 注意：此处刻意不递归扫描嵌套 bundle 内部。
                                // 游戏资源嵌套层级深/总体积可达数 GB，全量解压极易 OOM；
                                // 且无环检测时自引用 bundle 会导致栈溢出直接终止进程。
                                // 嵌套 bundle 只登记元数据，其内部内容按需在 extract 阶段处理。
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine($"[Skip] Bundle {fileName}: {ex.Message}");
                        }
                        finally
                        {
                            // 立刻卸载嵌套 bundle，释放其解压数据（异常路径也覆盖）
                            SafeUnloadBundleFile(manager, nestedPath);
                        }
                        break;

                    case FileType.Unknown:
                        break;


                }
                yield return new FileScanEvent(asset, bundle);
            }
            file.Close();
        }
        public IEnumerable<ExtractAssetEvent> ExtractAsset(string dbPath, AssetsFileInstance fileInst, ExtractInfo info)
        {
            yield return new ExtractAssetEvent("analyze", fileInst.name);
            yield return new ExtractAssetEvent("handle", info.AssetName ?? string.Empty);
            var file = fileInst.file;
            manager.LoadClassDatabaseFromPackage(file.Metadata.UnityVersion);
            var MonoAssets = file.GetAssetsOfType(AssetClassID.MonoBehaviour);
            var TextAssets = file.GetAssetsOfType(AssetClassID.TextAsset);
            var count = 0;
            foreach (var goInfo in MonoAssets)
            {
                List<TextOrigin> list = [];
                // 声明在 try 外部并初始化为 null：catch 后 AssetObj 仍有确定值，避免 CS0165
                AssetObject? AssetObj = null;
                try
                {
                    var goBase = manager.GetBaseField(fileInst, goInfo);

                    TraverseAndDetect(goBase, currentPath: "", onJapaneseFound: (keyPath, japaneseText) =>
                    {
                        count++;
                        var textObj = new TextOrigin()
                        {
                            Text = japaneseText,
                            FieldPath = keyPath
                        };
                        list.Add(textObj);
                    });

                    // 先确认含有日文再解析脚本类名：GetMonoBehaviourName 内部的 GetExtAsset
                    // 会触发外部依赖查找（可能加载依赖 assets 文件），对无日文对象应完全跳过
                    if (list.Count > 0)
                    {
                        var name = GetMonoBehaviourName(fileInst, goBase);
                        AssetObj = new AssetObject()
                        {
                            Type = "MonoBehavior",
                            Name = name,
                            PathId = goInfo.PathId,
                            AssetId = info.Id,
                            Size = goInfo.ByteSize,
                            LineCount = list.Count
                        };
                    }
                }
                catch
                { }

                if (AssetObj != null)
                {
                    var ObjWithText = new ObjWithText(){
                        obj = AssetObj,
                        list = list
                    };
                    yield return new ExtractAssetEvent("resource", ObjWithText);
                }
            }

            foreach (var goInfo in TextAssets)
            {
                List<TextOrigin> list = [];
                // 声明在 try 外部并初始化为 null：catch 后 AssetObj 仍有确定值，避免 CS0165
                AssetObject? AssetObj = null;
                try
                {
                    var goBase = manager.GetBaseField(fileInst, goInfo);
                    var name = goBase["m_Name"].AsString;
                    if (name == "") { name = "Unnamed asset"; }

                    // TraverseAndDetect 自身会遍历全部字段并识别日文字符串，
                    // 无需对 m_Script 单独预判后再遍历（原两分支合起来等价于始终遍历一次）
                    TraverseAndDetect(goBase, currentPath: "", onJapaneseFound: (keyPath, japaneseText) =>
                    {
                        count++;
                        var textObj = new TextOrigin()
                        {
                            Text = japaneseText,
                            FieldPath = keyPath
                        };
                        list.Add(textObj);
                    });
                    AssetObj = new AssetObject()
                    {
                        Type = "TextAsset",
                        Name = name,
                        PathId = goInfo.PathId,
                        AssetId = info.Id,
                        Size = goInfo.ByteSize,
                        LineCount = list.Count
                    };
                }
                catch { }
                // 仅含有日文文本的对象才需要落库
                if (AssetObj != null && list.Count > 0)
                {
                    var ObjWithText = new ObjWithText(){
                        obj = AssetObj,
                        list = list
                    };
                    yield return new ExtractAssetEvent("resource", ObjWithText);
                }
            }
            yield return new ExtractAssetEvent("discover", count.ToString());
        }
        
        public record ExtractAssetEvent(string type, object val);

        public static void TraverseAndDetect(
            AssetTypeValueField field,
            string currentPath,
            Action<string, string> onJapaneseFound)
        {
            if (field == null) return;

            if (field.Value != null && field.Value.ValueType == AssetValueType.String)
            {
                string strVal = field.AsString;
                if (!string.IsNullOrEmpty(strVal) && ContainsJapanese(strVal))
                {
                    onJapaneseFound(currentPath, strVal);
                }
                return;
            }

            if (field.Children == null || field.Children.Count == 0) return;

            bool isArray = field.Value != null && field.Value.ValueType == AssetValueType.Array;

            if (isArray)
            {
                for (int i = 0; i < field.Children.Count; i++)
                {
                    var child = field.Children[i];
                    string childPath = $"{currentPath}[{i}]";
                    TraverseAndDetect(child, childPath, onJapaneseFound);
                }
            }
            else
            {
                for (int i = 0; i < field.Children.Count; i++)
                {
                    var child = field.Children[i];

                    if (child.FieldName == "Array" && isArray)
                    {
                        TraverseAndDetect(child, currentPath, onJapaneseFound);
                        continue;
                    }

                    string childPath = string.IsNullOrEmpty(currentPath)
                        ? child.FieldName
                        : $"{currentPath}.{child.FieldName}";

                    TraverseAndDetect(child, childPath, onJapaneseFound);
                }
            }
        }

        private static bool ContainsJapanese(string strVal)
        {
            if (string.IsNullOrWhiteSpace(strVal)) return false;
            return FindRegex.IsMatch(strVal);
        }

        /// <summary>
        /// 参考 UABEA GetMonoBehaviourNameFast：通过 MonoBehaviour 的 m_Script PPtr 解析到 MonoScript，
        /// 读取其类名作为资产名。MonoBehaviour 自身的 m_Name 通常为空，而 MonoScript 的 m_Name 正是脚本类名
        /// （如 "StoryData"、"DialogueController"），对翻译提取更有意义。
        /// </summary>
        private string GetMonoBehaviourName(AssetsFileInstance fileInst, AssetTypeValueField goBase)
        {
            var name = goBase["m_Name"].AsString;
            if (string.IsNullOrEmpty(name))
            {
                try
                {
                    var scriptField = goBase["m_Script"];
                    if (scriptField != null)
                    {
                        var ext = manager.GetExtAsset(fileInst, scriptField, false);
                        if (ext.baseField != null)
                        {
                            // ext.baseField 已是反序列化好的 AssetTypeValueField
                            string className = ext.baseField["m_Name"].AsString;
                            if (!string.IsNullOrEmpty(className))
                                name = className;
                        }
                    }
                }
                catch
                { }
            }
            return string.IsNullOrEmpty(name) ? "Unnamed asset" : name;
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

        internal static void SafeUnloadAllInstance(AssetsManager manager)
        {
            try { manager.UnloadAll(); } catch { }
        }
    }
}