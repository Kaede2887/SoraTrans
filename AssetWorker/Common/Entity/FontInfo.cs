namespace AssetWorker.Common.Entity
{
    /// <summary>
    /// 字体资产提取结果，包含两类：
    /// TMP_FontAsset（TextMeshPro SDF 字体，资源类型为 MonoBehaviour）和
    /// Unity 原生 Font（AssetClassID.Font，m_FontData 内嵌 TTF/OTF 字节）。
    /// material/atlas_texture 的 PathID 供补丁阶段直接定位材质和纹理。
    /// </summary>
    public class FontInfo
    {
        public long Id { get; set; }
        /// <summary>字体资产种类："TMP"（TextMeshPro SDF 字体）或 "UnityFont"（原生 Font，内嵌 TTF/OTF）</summary>
        public required string Kind { get; set; }
        /// <summary>资产名（MonoBehaviour m_Name，如 "ZenKurenaido-Regular SC SDF"）</summary>
        public required string Name { get; set; }
        /// <summary>TMP: m_FaceInfo.m_FamilyName；UnityFont: m_FontNames 首个</summary>
        public string? FamilyName { get; set; }
        /// <summary>m_FaceInfo.m_StyleName，如 "Regular"（仅 TMP）</summary>
        public string? StyleName { get; set; }
        /// <summary>TMP 版本 m_Version，如 "1.1.0"（仅 TMP）</summary>
        public string? Version { get; set; }
        /// <summary>TMP: m_FaceInfo.m_PointSize；UnityFont: m_FontSize</summary>
        public double PointSize { get; set; }
        public int AtlasWidth { get; set; }
        public int AtlasHeight { get; set; }
        /// <summary>SDF 描边像素范围（TMP shader 的 AA 依据）（仅 TMP）</summary>
        public int AtlasPadding { get; set; }
        /// <summary>m_AtlasRenderMode（如 SDFAA=4165）（仅 TMP）</summary>
        public int AtlasRenderMode { get; set; }
        /// <summary>m_AtlasPopulationMode：0=静态 1=动态（仅 TMP）</summary>
        public int PopulationMode { get; set; }
        /// <summary>字形表数量（新版 m_GlyphTable / 旧版 m_glyphInfoList，仅 TMP）</summary>
        public int GlyphCount { get; set; }
        /// <summary>字符表数量（m_CharacterTable，仅 TMP）</summary>
        public int CharacterCount { get; set; }
        /// <summary>Unity 原生字体的字体名列表 m_FontNames，多个以逗号连接</summary>
        public string? FontNames { get; set; }
        /// <summary>内嵌 TTF/OTF 字节数（m_FontData），0 表示无内嵌数据、引用系统字体（仅 UnityFont）</summary>
        public long FontDataSize { get; set; }
        /// <summary>MonoBehaviour/Font 在 assets 文件中的 PathId，同库内唯一</summary>
        public long PathId { get; set; }
        /// <summary>所属 assets 资产 id（assets 表外键）</summary>
        public long AssetId { get; set; }
        /// <summary>TMP: m_Material；UnityFont: m_DefaultMaterial 的 PathId</summary>
        public long? MaterialPathId { get; set; }
        /// <summary>TMP: 图集 Texture2D；UnityFont: m_Texture 的 PathId</summary>
        public long? AtlasTexturePathId { get; set; }
    }
}
