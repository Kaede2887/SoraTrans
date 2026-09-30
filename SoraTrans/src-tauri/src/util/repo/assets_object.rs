use crate::{pojo::asset_object_info::AssetObjectInfo, util::db_manager::DbManager};

pub async fn select_asset_object_list(
    manager: &DbManager,
    id: i64,
    sort: Option<String>
) -> Result<Vec<AssetObjectInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    
    let sql = format!(
        r#"
            SELECT * FROM assets_object
            WHERE asset_id = ?
            {}
        "#,
        sort.unwrap_or_default()
    );
    
    let result = sqlx::query_as::<_, AssetObjectInfo>(&sql)
        .bind(id)    
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn search_asset_obj_by_name(
    manager: &DbManager,
    id: i64,
    val: String,
    sort: Option<String>
) -> Result<Vec<AssetObjectInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    
    let sql = format!(
        r#"
            SELECT assets_object.*
            FROM assets_object
            WHERE assets_object.asset_id = ?
            AND (
                assets_object.name LIKE '%{}%'
                OR EXISTS (
                    SELECT 1
                    FROM text_origin
                    WHERE text_origin.object_id = assets_object.id
                    AND text_origin.text LIKE '%{}%'
                )
            )
            {};  
        "#,
        val,
        val,
        sort.unwrap_or_default()
    );

    let result = sqlx::query_as::<_, AssetObjectInfo>(&sql)
        .bind(id)    
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}