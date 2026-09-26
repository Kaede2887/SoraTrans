using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AssetWorker.Common.Entity
{
    public enum GameBackend
    {
        Unknown,
        Mono,
        IL2CPP
    }
    public class UnityEnvInfo
    {
        public GameBackend Backend { get; set; } = GameBackend.Unknown;
        public string? DataPath { get; set; }
        // Mono 相关的 Managed 目录 (包含 Assembly-CSharp.dll)
        public string? ManagedPath { get; set; }
        // IL2CPP 相关的路径
        public string? GameAssemblyPath { get; set; }
        public string? MetadataPath { get; set; }
    }
}