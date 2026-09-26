using AssetsTools.NET.Extra;
using AssetWorker.Common.Entity;
using AssetWorker.Mapper;

namespace AssetWorker.Service.Impl
{
    public class AssetScanner
    {
        /// <summary>
        /// 补丁输出目录的固定名称：make_patch 会在用户所选目录下创建该子目录，
        /// 扫描时整棵剪枝跳过，避免导出位置选在游戏目录内时扫到补丁文件
        /// （补丁包与原始资源同名但结构不完整，会被识别为无法打开的脏数据）
        /// </summary>
        public const string OutputFolderName = "SoraTransOutput";

        private static readonly AssetMapper assetMapper = new();
        private static readonly BundleMapper bundleMapper = new();
        private static readonly HashSet<string> IgnoreExtensions =
            new(StringComparer.OrdinalIgnoreCase)
            {
                // 程序文件
                ".exe",".dll",".pdb",".bak",
                // 日志配置
                ".log",".txt",".xml",".ini",".cfg",".config",
                // 普通图片
                ".png",".jpg",".jpeg",".bmp",".gif",".webp",
                // 普通音频
                ".mp3",".wav",".ogg",".flac",
                // 视频
                ".mp4",".avi",".webm",".mov",
                // Unity工程文件
                ".cs",".meta",".shader",".hlsl",".cginc"
            };
        public static List<string> FilterFile(string path)
        {
            var list = new List<string>();
            // 手动递归以便整棵剪枝输出目录（EnumerateFiles 的 AllDirectories 无法跳过子树）
            var pending = new Stack<string>();
            pending.Push(path);
            while (pending.Count > 0)
            {
                var dir = pending.Pop();

                IEnumerable<string> files;
                IEnumerable<string> subDirs;
                try
                {
                    files = Directory.EnumerateFiles(dir);
                    subDirs = Directory.EnumerateDirectories(dir);
                }
                catch (UnauthorizedAccessException)
                {
                    continue;
                }
                catch (DirectoryNotFoundException)
                {
                    continue;
                }

                foreach (var file in files)
                {
                    string ext = Path.GetExtension(file);

                    if (!string.IsNullOrEmpty(ext) &&
                       IgnoreExtensions.Contains(ext))
                    {
                        continue;
                    }

                    list.Add(file);
                }

                foreach (var subDir in subDirs)
                {
                    if (string.Equals(
                            Path.GetFileName(subDir),
                            OutputFolderName,
                            StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                    pending.Push(subDir);
                }
            }
            return list;
        }

        public static IEnumerable<FileScanEvent> ScanFile(List<string> fileList,string dbPath)
        {
            foreach (var file in fileList)
            {
                Asset? asset = null;
                Bundle? bundle = null;

                var fileName = Path.GetFileName(file);
                FileInfo fileInfo = new(file);
                FileType ft = AssetFileReader.DetectFileType(file);
                switch (ft)
                {
                    case FileType.Assets:
                        double AssetSize = fileInfo.Length / (1024.0 * 1024);
                        asset = new Asset
                        {
                            Name = fileName,
                            Size = AssetSize.ToString("0.00"),
                            Path = file
                        };
                        assetMapper.InsertAsset(dbPath,asset);
                        break;
                    case FileType.Bundle:
                        double bundleSize = fileInfo.Length / (1024.0 * 1024);
                        bundle = new Bundle
                        {
                            Name = fileName,
                            Size = bundleSize.ToString("0.00"),
                            Path = file,
                        };
                        bundleMapper.InsertBundle(dbPath,bundle);
                        break;
                }

                yield return new FileScanEvent(asset, bundle);
            }
        }
    }

    /// <summary>
    /// 单文件扫描事件：Scanned/Total 为进度，Asset/Bundle 至多一个非 null（未识别时均为 null）
    /// </summary>
    public record FileScanEvent( Asset? Asset, Bundle? Bundle);
}