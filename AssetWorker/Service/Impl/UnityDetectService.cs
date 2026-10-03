using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AssetWorker.Common.Entity;

namespace AssetWorker.Service.Impl
{
    public class UnityDetectService
    {
        public UnityEnvInfo DetectEnvInfo(string path, string? title)
        {
            var info = new UnityEnvInfo();

            if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
                return info;

            // 优先使用前端传入的 title 精确匹配 {Title}_Data 目录；
            // 匹配失败再回退到原有 *_Data 枚举逻辑，兼容未传 title 的情况
            string? dataDir = null;
            if (!string.IsNullOrWhiteSpace(title))
            {
                var titleDataDir = Path.Combine(path, $"{title}_Data");
                if (Directory.Exists(titleDataDir))
                    dataDir = titleDataDir;
            }
            dataDir ??= Directory.EnumerateDirectories(path, "*_Data").FirstOrDefault();

            info.DataPath = dataDir;

            var enumOptions = new EnumerationOptions
            {
                RecurseSubdirectories = true,
                MaxRecursionDepth = 5,
                MatchCasing = MatchCasing.CaseInsensitive
            };

            var metaPath = Directory.EnumerateFiles(path, "global-metadata.dat", enumOptions).FirstOrDefault();

            if (metaPath != null)
            {
                info.Backend = GameBackend.IL2CPP;
                info.MetadataPath = metaPath;
                // 查找 GameAssembly.dll (同样使用 EnumerateFiles)
                info.GameAssemblyPath = Directory.EnumerateFiles(path, "GameAssembly.dll", enumOptions).FirstOrDefault();
                return info;
            }

            var monoPath = Directory.EnumerateFiles(path, "Assembly-CSharp.dll", enumOptions).FirstOrDefault();

            if (monoPath == null && dataDir != null)
            {
                string managedCandidate = Path.Combine(dataDir, "Managed");
                if (Directory.Exists(managedCandidate))
                {
                    monoPath = Directory.EnumerateFiles(managedCandidate, "*.dll").FirstOrDefault();
                }
            }

            if (monoPath != null)
            {
                info.Backend = GameBackend.Mono;
                info.ManagedPath = Path.GetDirectoryName(monoPath);
                return info;
            }

            return info;
        }
    }
}