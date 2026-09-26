using AssetsTools.NET.Extra;
using AssetWorker.Common.Entity;
using AssetWorker.Mapper;

namespace AssetWorker.Service.Impl
{
    public class AssetScanner
    {
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
            List<string> list = [];
            foreach (var file in Directory.EnumerateFiles(
                path,
                "*",
                SearchOption.AllDirectories))
            {
                string ext = Path.GetExtension(file);

                if (!string.IsNullOrEmpty(ext) &&
                   IgnoreExtensions.Contains(ext))
                {
                    continue;
                }

                list.Add(file);
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