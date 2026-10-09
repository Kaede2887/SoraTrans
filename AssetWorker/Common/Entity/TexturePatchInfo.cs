namespace AssetWorker.Common.Entity;

/// <summary>
/// 纹理导入补丁：用户上传 PNG 按原 Texture2D 格式编码后的数据，
/// 存库等待制作补丁时与文本修改一起打包到 SoraTransOutput。
/// id 即 assets_object.id（一对一），INSERT OR REPLACE 实现覆盖更新。
/// MakePatch 时通过 JOIN assets_object/assets/bundle 填充定位字段。
/// </summary>
public class TexturePatchInfo
{
    /// <summary>assets_object 主键，同一对象重复导入以 INSERT OR REPLACE 覆盖</summary>
    public int Id { get; set; }
    /// <summary>按原 m_TextureFormat 重新编码后的纹理字节（内嵌 pictureData）</summary>
    public byte[] PictureData { get; set; } = [];
    public int Width { get; set; }
    public int Height { get; set; }
    public int TextureFormat { get; set; }

    // —— 以下字段由 SelectMakePatchInfo 的 JOIN 填充，供 AssetWriter 定位对象 ——

    /// <summary>对象在 SerializedFile 中的 PathId（assets_object.path_id）</summary>
    public long ObjectPathId { get; set; }
    public required string AssetName { get; set; }
    public required string AssetPath { get; set; }
    public string? BundleName { get; set; }
    public string? BundlePath { get; set; }
}
