using Dapper;
using AssetWorker.Common.Entity;
using Microsoft.Data.Sqlite;

namespace AssetWorker.Mapper;

/// <summary>
/// 纹理导入补丁数据访问：存库（不写文件）+ 制作补丁时 JOIN 查出定位信息。
/// 效仿 TextOriginMapper 的 SelectMakePatchInfo 模式。
/// </summary>
public class TexturePatchMapper
{
    private readonly SqliteFactory _factory = new();

    private const string UpsertSql = """
        INSERT OR REPLACE INTO texture_patch (id, picture_data, width, height, texture_format)
        VALUES (@Id, @PictureData, @Width, @Height, @TextureFormat)
    """;

    private const string SelectMakePatchSql = """
        SELECT
            tp.id AS Id,
            tp.picture_data AS PictureData,
            tp.width AS Width,
            tp.height AS Height,
            tp.texture_format AS TextureFormat,
            ao.path_id AS ObjectPathId,
            a.name AS AssetName,
            a.path AS AssetPath,
            b.name AS BundleName,
            b.path AS BundlePath
        FROM texture_patch AS tp
        JOIN assets_object AS ao
            ON ao.id = tp.id
        JOIN assets AS a
            ON a.id = ao.asset_id
        LEFT JOIN bundle AS b
            ON b.name = a.parent_bundle_name
    """;

    /// <summary>
    /// 存（或覆盖）一条纹理导入补丁。id = assets_object.id。
    /// 如果 texture_patch 表不存在（迁移未执行），给出明确的错误提示。
    /// </summary>
    public void Upsert(string dbPath, TexturePatchInfo info)
    {
        try
        {
            using var conn = _factory.Create(dbPath);
            conn.Open();
            conn.Execute(UpsertSql, info);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"存入纹理补丁失败（texture_patch 表可能未创建，请重新打开游戏以执行迁移）: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// 查询全部待打包的纹理补丁（含 assets_object/assets/bundle 定位信息）。
    /// </summary>
    public IEnumerable<TexturePatchInfo> SelectMakePatchInfo(string dbPath)
    {
        using var conn = _factory.Create(dbPath);
        return conn.Query<TexturePatchInfo>(SelectMakePatchSql);
    }
}
