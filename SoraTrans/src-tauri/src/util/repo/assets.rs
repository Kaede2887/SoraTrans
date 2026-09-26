use crate::{
    db_manager::DbManager,
    pojo::{asset_info::AssetInfo, scan_status::ScanStatus},
};

pub async fn select_scan_status(manager: &DbManager) -> Result<ScanStatus, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    let result = sqlx::query_as::<_, ScanStatus>(
        r#"
            SELECT COUNT(*) AS total, 
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS scanned,   
            SUM(line_count) AS line 
            FROM assets
        "#,
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn select_asset_list(manager: &DbManager) -> Result<Vec<AssetInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    let result = sqlx::query_as::<_, AssetInfo>(
        r#"
            SELECT * FROM assets ORDER BY line_count DESC
        "#,
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result)
}
