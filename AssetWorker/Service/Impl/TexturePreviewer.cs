using System;
using System.IO;
using AssetsTools.NET;
using AssetsTools.NET.Extra;
using AssetsTools.NET.Texture;

namespace AssetWorker.Service.Impl
{
    /// <summary>
    /// Texture2D 预览结果：PNG 字节与纹理元信息（供前端展示尺寸/格式）。
    /// </summary>
    public record TexturePreview(byte[] Png, int Width, int Height, int TextureFormat);

    /// <summary>
    /// Texture2D 导入结果：导入后纹理的尺寸/格式（导入的 PNG 尺寸可能与原纹理不同，
    /// EncodeTextureImage 会按 PNG 实际尺寸更新 m_Width/m_Height）。
    /// </summary>
    public record TextureImportResult(int Width, int Height, int TextureFormat);

    /// <summary>
    /// PNG 编码后的纹理数据：按原 m_TextureFormat 重新编码的字节流 + 尺寸/格式。
    /// 存入 texture_patch 表，制作补丁时由 AssetWriter 应用到 baseField。
    /// </summary>
    public record EncodedTextureData(byte[] PictureData, int Width, int Height, int TextureFormat);

    /// <summary>
    /// 参考 AssetStudio 的 Texture2D 预览流程：读取 Texture2D 字段树 →
    /// 收集像素数据（内嵌 image data 或 m_StreamData 指向的 resS，bundle 内 resS 从 bundle 流读取）
    /// → 按 TextureFormat 解码为 BGRA32 → 编码 PNG。
    /// 解码/编码由 AssetsTools.NET.Texture 完成，其格式解码器移植自 AssetStudio
    /// （DXT/BC7/ETC/ASTC/PVRTC/Crunch 等均支持）。
    /// </summary>
    public class TexturePreviewer(AssetsManager assetsManager)
    {
        private readonly AssetsManager manager = assetsManager;

        public TexturePreview DecodeToPng(AssetsFileInstance fileInst, long pathId)
        {
            var assetFile = fileInst.file;
            manager.LoadClassDatabaseFromPackage(assetFile.Metadata.UnityVersion);

            AssetFileInfo info = assetFile.GetAssetInfo(pathId)
                ?? throw new InvalidOperationException($"PathId {pathId} 在资源文件中不存在");

            int typeId = info.GetTypeId(assetFile);
            if (typeId != (int)AssetClassID.Texture2D)
            {
                throw new InvalidOperationException($"该对象类型为 {typeId}，不是 Texture2D(28)，无法预览纹理");
            }

            AssetTypeValueField baseField = manager.GetBaseField(fileInst, info);
            TextureFile tex = TextureFile.ReadTextureFile(baseField);

            if (tex.m_Width <= 0 || tex.m_Height <= 0)
            {
                throw new InvalidOperationException($"纹理尺寸非法：{tex.m_Width}x{tex.m_Height}");
            }

            // FillPictureData(AssetsFileInstance) 内部会按三种情况取数：
            // 1. parentBundle 非空且 m_StreamData 有效 → 从 bundle 内 resS 读取（SetPictureDataFromBundle）
            // 2. m_StreamData.path 指向磁盘 .resS → 从 assets 同级目录读取
            // 3. 无流式数据 → 直接返回内嵌 image data
            byte[]? pictureData = tex.FillPictureData(fileInst);
            if (pictureData == null || pictureData.Length == 0)
            {
                throw new InvalidOperationException(
                    "无法获取纹理像素数据（m_StreamData 指向的 resS 在 bundle/磁盘中均不存在）");
            }

            using MemoryStream pngStream = new();
            // quality 对 PNG 无意义，传 -1
            bool success = tex.DecodeTextureImage(pictureData, pngStream, ImageExportType.Png, -1);
            if (!success || pngStream.Length == 0)
            {
                throw new InvalidOperationException(
                    $"纹理解码失败，可能是不支持的格式：TextureFormat={(TextureFormat)tex.m_TextureFormat}({tex.m_TextureFormat})");
            }

            return new TexturePreview(pngStream.ToArray(), tex.m_Width, tex.m_Height, tex.m_TextureFormat);
        }

        /// <summary>
        /// 参考 UABEAvalonia 的 Texture 导入编码流程：读取原 Texture2D 字段树 →
        /// 将用户上传的 PNG 按 m_TextureFormat 重新编码（managed 编码器仅支持
        /// RGBA 系列格式，DXT/BC7/ETC/ASTC 等格式会抛 NotSupportedException）→
        /// EncodeTextureImage 内部已通过 SetPictureData 把编码数据内嵌到 tex.pictureData
        /// （同时清空 m_StreamData，使导入后的纹理不再依赖 .resS 文件）。
        /// 本方法只做编码，不调 WriteTo/SetNewData，把 pictureData 与尺寸/格式返回给调用方，
        /// 由调用方存入 texture_patch 表，制作补丁时再由 AssetWriter 应用到 baseField。
        /// </summary>
        public EncodedTextureData EncodePngToTextureData(AssetsFileInstance fileInst, long pathId, byte[] pngData)
        {
            var assetFile = fileInst.file;
            manager.LoadClassDatabaseFromPackage(assetFile.Metadata.UnityVersion);

            AssetFileInfo info = assetFile.GetAssetInfo(pathId)
                ?? throw new InvalidOperationException($"PathId {pathId} 在资源文件中不存在");

            int typeId = info.GetTypeId(assetFile);
            if (typeId != (int)AssetClassID.Texture2D)
            {
                throw new InvalidOperationException(
                    $"该对象类型为 {typeId}，不是 Texture2D(28)，无法导入纹理");
            }

            AssetTypeValueField baseField = manager.GetBaseField(fileInst, info);
            TextureFile tex = TextureFile.ReadTextureFile(baseField);

            using MemoryStream pngStream = new(pngData);
            // quality 对无失真格式无意义，传 -1。
            // EncodeTextureImage 内部先尝试 native 编码（本包未携带 native 库，返回 null），
            // 回退到 EncodeManagedImage：用 StbImageSharp 读 PNG 得到 RGBA32，翻转后
            // 调 EncodeManagedData 按 m_TextureFormat 编码。
            // 如果原格式不支持 managed 编码（DXT/BC7/ETC/ASTC/Crunch 等），自动降级为
            // RGBA32 重试：RGBA32 是 Unity 通用非压缩格式，游戏可正常读取，仅体积增大。
            int originalFormat = tex.m_TextureFormat;
            try
            {
                tex.EncodeTextureImage(pngStream, -1);
            }
            catch (NotSupportedException)
            {
                // 原格式不支持 managed 编码，降级为 RGBA32 重试
                tex.m_TextureFormat = (int)TextureFormat.RGBA32;
                pngStream.Position = 0;
                try
                {
                    tex.EncodeTextureImage(pngStream, -1);
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException(
                        $"纹理格式 {(TextureFormat)originalFormat}({originalFormat}) " +
                        $"降级为 RGBA32 后仍编码失败: {ex.Message}", ex);
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    $"纹理编码失败（格式 {(TextureFormat)tex.m_TextureFormat}({tex.m_TextureFormat}））: {ex.Message}", ex);
            }

            // EncodeTextureImage 内部已通过 SetPictureData 更新 m_Width/m_Height、
            // 清空 m_StreamData、设置 tex.pictureData 与 m_CompleteImageSize。
            // 这里不调 WriteTo/SetNewData，只返回编码数据，由调用方存库、
            // 制作补丁时再 WriteTo(baseField) + info.SetNewData(baseField)。
            return new EncodedTextureData(
                tex.pictureData ?? [],
                tex.m_Width,
                tex.m_Height,
                tex.m_TextureFormat);
        }
    }
}
