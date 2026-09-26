using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AssetsTools.NET;
using AssetWorker.Common.Entity;

namespace AssetWorker.Service.Impl
{
    public class AssetFileReader
    {
        public static FileType DetectFileType(string file)
        {
            using FileStream fs = File.OpenRead(file);
            using AssetsFileReader r = new(fs);
            return DetectFileType(r, 0);
        }

        public static FileType DetectFileType(AssetsFileReader r, long startAddress)
        {
            // 保护：确保流有足够的字节可读（Format 22 至少需要 0x20 字节）
            if (r.BaseStream.Length - startAddress < 0x20)
            {
                return FileType.Unknown;
            }

            bool originalBigEndian = r.BigEndian;

            try
            {
                // -------------------------------------------------------------
                // 1. 检查 Bundle 签名 (UnityFS / UnityRaw / UnityWeb)
                // -------------------------------------------------------------
                r.BaseStream.Seek(startAddress, SeekOrigin.Begin);
                r.BigEndian = false;

                // 读取 7 个字节的 Signature
                string possibleBundleHeader = r.ReadStringLength(7);
                if (possibleBundleHeader == "UnityFS" || possibleBundleHeader == "UnityWeb" || possibleBundleHeader == "UnityRaw")
                {
                    return FileType.Bundle;
                }

                // -------------------------------------------------------------
                // 2. 检查 Assets 文件 (SerializedFile)
                // Header 必须用【大端序 (Big-Endian)】读取
                // -------------------------------------------------------------
                r.BaseStream.Seek(startAddress, SeekOrigin.Begin);
                r.BigEndian = true;

                uint metadataSize = r.ReadUInt32(); // 0x00

                // 读取 Format Version (Format < 22 时位于 0x08，Format >= 22 时位于 0x04)
                // 先按标准 Header 结构预览第 3 个 uint (偏移 0x08)
                uint fileSize32 = r.ReadUInt32();   // 0x04
                uint format = r.ReadUInt32();       // 0x08
                uint dataOffset32 = r.ReadUInt32(); // 0x0C

                // 特殊情况：Format >= 22 时，0x04 位置是 format version（如 22-25），
                // 0x08 位置是 64 位 fileSize 的高 32 位。
                // 大文件时高位 > 0（通常 > 100），小文件时高位 == 0（format 不可能为 0）
                if (fileSize32 > 0 && fileSize32 < 100 && (format > 100 || format == 0))
                {
                    format = fileSize32; // 0x04 位置的数据才是真实的 format
                }

                // --- 针对 Unity 2020.1+ (Format Version >= 22 / 0x16) 的 64 位处理 ---
                if (format >= 0x16)
                {
                    if (r.BaseStream.Length - startAddress >= 0x20)
                    {
                        r.BaseStream.Seek(startAddress + 0x08, SeekOrigin.Begin);
                        ulong fileSize64 = r.ReadUInt64();   // 偏移 0x08 - 0x0F (8字节)
                        ulong dataOffset64 = r.ReadUInt64(); // 偏移 0x10 - 0x17 (8字节)

                        // 只要 Format 合理且 (fileSize 或 dataOffset 有值)，即判定为 Assets
                        if (format < 100 && (fileSize64 > 0 || dataOffset64 > 0))
                        {
                            return FileType.Assets;
                        }
                    }
                }
                else
                {
                    // --- Format < 22 的 32 位标准校验 ---
                    if (format > 0 && format < 50 && (fileSize32 > 0 || dataOffset32 > 0))
                    {
                        return FileType.Assets;
                    }
                }

                return FileType.Unknown;
            }
            catch
            {
                return FileType.Unknown;
            }
            finally
            {
                r.BigEndian = originalBigEndian;
            }
        }
    }
}