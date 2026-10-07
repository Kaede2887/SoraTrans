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
            var FontAssets = file.GetAssetsOfType(AssetClassID.Font);
            var count = 0;
            foreach (var goInfo in MonoAssets)
            {
                List<TextOrigin> list = [];
                // 声明在 try 外部并初始化为 null：catch 后仍有确定值，避免 CS0165
                AssetObject? AssetObj = null;
                FontInfo? fontObj = null;
                try
                {
                    var goBase = manager.GetBaseField(fileInst, goInfo);

                    // TMP 字体（TMP_FontAsset，资源类型仍是 MonoBehaviour）单独识别入库：
                    // 其 m_CreationSettings.characterSequence 含整包日文字符，继续当日文
                    // 文本遍历会把字符集污染进 text_origin，因此识别为字体后跳过文本提取
                    if (IsTmpFont(fileInst, goBase))
                    {
                        fontObj = BuildFontInfo(goBase, goInfo.PathId, info.Id);
                    }
                    else
                    {
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
                }
                catch
                { }

                if (fontObj != null)
                {
                    yield return new ExtractAssetEvent("font", fontObj);
                }
                else if (AssetObj != null)
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
            // Unity 原生 Font（内置类型 AssetClassID.Font）：m_FontData 内嵌 TTF/OTF 字节，
            // 与是否含日文无关，全部登记入库供后续补丁替换；单个解析失败不中断整轮提取
            foreach (var fontInfo in FontAssets)
            {
                FontInfo? font = null;
                try
                {
                    var fontBase = manager.GetBaseField(fileInst, fontInfo);
                    font = BuildUnityFontInfo(fontBase, fontInfo.PathId, info.Id);
                }
                catch
                { }
                // C# 迭代器不允许在含 catch 的 try 内 yield，判空移到 try 外
                if (font != null)
                    yield return new ExtractAssetEvent("font", font);
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

        /// <summary>
        /// 判断 MonoBehaviour 是否为 TMP_FontAsset。
        /// 优先用序列化结构特征（只读本资产字段，不触发外部依赖加载）：
        /// TMP_FontAsset 必有 m_FaceInfo、m_Version 和字形表
        /// （1.5+ 为 m_GlyphTable，旧版为 m_glyphInfoList），普通脚本不会有这些字段。
        /// 结构判定不出来时再按用户约定用资产名包含 SDF 兜底，并解析 MonoScript
        /// 类名确认为 TMP_FontAsset，避免误伤同名普通脚本。
        /// </summary>
        private bool IsTmpFont(AssetsFileInstance fileInst, AssetTypeValueField goBase)
        {
            // 字段树整体可能是 dummy（找不到对应类的序列化布局），dummy 上的索引器虽返回 null
            // 但这里仍显式排除，避免任何版本差异导致误判
            if (goBase == null || goBase.IsDummy) return false;

            if (!IsDummy(goBase["m_FaceInfo"])
                && !IsDummy(goBase["m_Version"])
                && (!IsDummy(goBase["m_GlyphTable"]) || !IsDummy(goBase["m_glyphInfoList"])))
            {
                return true;
            }

            var assetName = SafeString(goBase["m_Name"]);
            if (!string.IsNullOrEmpty(assetName)
                && assetName.Contains("SDF", StringComparison.OrdinalIgnoreCase))
            {
                return TryGetMonoScriptClassName(fileInst, goBase) == "TMP_FontAsset";
            }
            return false;
        }

        private static bool IsDummy(AssetTypeValueField? field) => field == null || field.IsDummy;

        /// <summary>
        /// 解析 MonoBehaviour 的 m_Script PPtr 指向的 MonoScript，读取其 m_ClassName。
        /// 会触发外部依赖查找，仅在名字兜底路径使用；任何异常返回 null。
        /// </summary>
        private string? TryGetMonoScriptClassName(AssetsFileInstance fileInst, AssetTypeValueField goBase)
        {
            try
            {
                var scriptField = goBase["m_Script"];
                if (scriptField == null) return null;
                var ext = manager.GetExtAsset(fileInst, scriptField, false);
                return SafeString(ext.baseField?["m_ClassName"]);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// 从 TMP_FontAsset 字段树提取字体信息。全部字段逐个容错读取，
        /// 不同 TMP 版本个别字段缺失时给默认值，不影响整轮提取。
        /// </summary>
        private FontInfo? BuildFontInfo(AssetTypeValueField goBase, long pathId, long assetId)
        {
            try
            {
                var face = goBase["m_FaceInfo"];
                // 新版字形表 m_GlyphTable，旧版兼容 m_glyphInfoList
                var glyphSizeField = Nav(goBase, "m_GlyphTable", "Array", "size")
                    ?? Nav(goBase, "m_glyphInfoList", "Array", "size");

                long? atlasTexturePathId = null;
                var atlasArray = Nav(goBase, "m_AtlasTextures", "Array");
                if (atlasArray is { Children.Count: > 0 })
                {
                    atlasTexturePathId = SafeNullableLong(Nav(atlasArray[0], "data", "m_PathID"));
                }

                return new FontInfo()
                {
                    Kind = "TMP",
                    Name = SafeString(goBase["m_Name"]) is { Length: > 0 } n ? n : "Unnamed font",
                    FamilyName = SafeString(face?["m_FamilyName"]),
                    StyleName = SafeString(face?["m_StyleName"]),
                    Version = SafeString(goBase["m_Version"]),
                    PointSize = SafeDouble(face?["m_PointSize"]),
                    AtlasWidth = SafeInt(goBase["m_AtlasWidth"]),
                    AtlasHeight = SafeInt(goBase["m_AtlasHeight"]),
                    AtlasPadding = SafeInt(goBase["m_AtlasPadding"]),
                    AtlasRenderMode = SafeInt(goBase["m_AtlasRenderMode"]),
                    PopulationMode = SafeInt(goBase["m_AtlasPopulationMode"]),
                    GlyphCount = SafeInt(glyphSizeField),
                    CharacterCount = SafeInt(Nav(goBase, "m_CharacterTable", "Array", "size")),
                    PathId = pathId,
                    AssetId = assetId,
                    MaterialPathId = SafeNullableLong(goBase["m_Material"]?["m_PathID"]),
                    AtlasTexturePathId = atlasTexturePathId
                };
            }
            catch
            {
                return null;
            }
        }

        // 字段树逐级取值，任一级缺失返回 null，避免链式判空样板代码
        private static AssetTypeValueField? Nav(AssetTypeValueField? root, params string[] path)
        {
            var cur = root;
            foreach (var p in path)
            {
                if (cur == null) return null;
                cur = cur[p];
            }
            return cur;
        }

        /// <summary>
        /// 从 Unity 原生 Font（AssetClassID.Font）字段树提取信息。
        /// m_FontData 为内嵌 TTF/OTF 二进制（可能数 MB），只记录长度不存内容；
        /// 长度 0 表示该字体引用系统字体（m_FontNames 名字回退）。
        /// </summary>
        private FontInfo? BuildUnityFontInfo(AssetTypeValueField fontBase, long pathId, long assetId)
        {
            try
            {
                if (fontBase == null || fontBase.IsDummy) return null;

                var names = new List<string>();
                var namesArray = Nav(fontBase, "m_FontNames", "Array");
                if (namesArray is { Children.Count: > 0 })
                {
                    foreach (var n in namesArray.Children)
                    {
                        var s = SafeString(n);
                        if (!string.IsNullOrEmpty(s)) names.Add(s);
                    }
                }

                return new FontInfo()
                {
                    Kind = "UnityFont",
                    Name = SafeString(fontBase["m_Name"]) is { Length: > 0 } fontName ? fontName : "Unnamed font",
                    FamilyName = names.FirstOrDefault(),
                    FontNames = names.Count > 0 ? string.Join(",", names) : null,
                    PointSize = SafeDouble(fontBase["m_FontSize"]),
                    FontDataSize = SafeByteArraySize(fontBase["m_FontData"]),
                    PathId = pathId,
                    AssetId = assetId,
                    MaterialPathId = SafeNullableLong(fontBase["m_DefaultMaterial"]?["m_PathID"]),
                    AtlasTexturePathId = SafeNullableLong(fontBase["m_Texture"]?["m_PathID"])
                };
            }
            catch
            {
                return null;
            }
        }

        // byte[] 在 AssetsTools 中可能反序列化为 ByteArray（直接取长度），
        // 也可能是普通 Array（读 Array/size），两种都兼容
        private static long SafeByteArraySize(AssetTypeValueField? field)
        {
            if (field == null) return 0;
            try
            {
                if (field.Value != null && field.Value.ValueType == AssetValueType.ByteArray)
                    return field.AsByteArray.Length;
                var size = Nav(field, "Array", "size");
                return size != null ? size.AsLong : 0;
            }
            catch
            {
                return 0;
            }
        }

        // AssetsTools 的 As* 访问器在类型不匹配时抛异常，字段树脏数据下需逐个容错
        private static string? SafeString(AssetTypeValueField? field)
        {
            try { return field?.AsString; } catch { return null; }
        }
        private static int SafeInt(AssetTypeValueField? field, int def = 0)
        {
            try { return field?.AsInt ?? def; } catch { return def; }
        }
        private static long? SafeNullableLong(AssetTypeValueField? field)
        {
            if (field == null) return null;
            try { return field.AsLong; } catch { return null; }
        }
        private static double SafeDouble(AssetTypeValueField? field)
        {
            try { return field?.AsFloat ?? 0; } catch { return 0; }
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