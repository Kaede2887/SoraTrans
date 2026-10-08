use crate::{pojo::asset_object_info::AssetObjectInfo, util::db_manager::DbManager};

pub async fn select_distinct_types(
    manager: &DbManager,
    id: i64,
) -> Result<Vec<String>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    // id = 0 时不按 asset_id 过滤（展示全部）
    let sql = if id == 0 {
        "SELECT DISTINCT type FROM assets_object ORDER BY type"
    } else {
        "SELECT DISTINCT type FROM assets_object WHERE asset_id = ? ORDER BY type"
    };

    let mut query = sqlx::query_scalar::<_, String>(sql);
    if id != 0 {
        query = query.bind(id);
    }
    let result = query
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn select_asset_object_list(
    manager: &DbManager,
    id: i64,
    sort: Option<String>,
    types: Option<Vec<String>>,
) -> Result<Vec<AssetObjectInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    // 类型过滤：None = 不过滤（展示全部）；Some(非空) = IN 过滤；Some(空) = 什么都不展示
    let type_clause = match &types {
        Some(ts) if !ts.is_empty() => {
            let placeholders: Vec<&str> = ts.iter().map(|_| "?").collect();
            format!("AND type IN ({})", placeholders.join(","))
        }
        Some(_) => "AND 1=0".to_string(),
        None => String::new(),
    };

    // id = 0 时不按 asset_id 过滤（展示全部）
    let asset_clause = if id == 0 {
        String::new()
    } else {
        "AND asset_id = ?".to_string()
    };

    let sql = format!(
        r#"
            SELECT * FROM assets_object
            WHERE 1=1
            {}
            {}
            {}
        "#,
        asset_clause,
        type_clause,
        sort.unwrap_or_default()
    );

    let mut query = sqlx::query_as::<_, AssetObjectInfo>(&sql);
    if id != 0 {
        query = query.bind(id);
    }
    if let Some(ts) = &types {
        for t in ts {
            query = query.bind(t);
        }
    }
    let result = query
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn search_asset_obj_by_name(
    manager: &DbManager,
    id: i64,
    val: String,
    sort: Option<String>,
    types: Option<Vec<String>>,
) -> Result<Vec<AssetObjectInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let type_clause = match &types {
        Some(ts) if !ts.is_empty() => {
            let placeholders: Vec<&str> = ts.iter().map(|_| "?").collect();
            format!("AND assets_object.type IN ({})", placeholders.join(","))
        }
        Some(_) => "AND 1=0".to_string(),
        None => String::new(),
    };

    // id = 0 时不按 asset_id 过滤（展示全部）
    let asset_clause = if id == 0 {
        String::new()
    } else {
        "AND assets_object.asset_id = ?".to_string()
    };

    let sql = format!(
        r#"
            SELECT assets_object.*
            FROM assets_object
            WHERE 1=1
            {}
            AND (
                assets_object.name LIKE '%{}%'
                OR EXISTS (
                    SELECT 1
                    FROM text_origin
                    WHERE text_origin.object_id = assets_object.id
                    AND text_origin.text LIKE '%{}%'
                )
            )
            {}
            {};  
        "#,
        asset_clause,
        val,
        val,
        type_clause,
        sort.unwrap_or_default()
    );

    let mut query = sqlx::query_as::<_, AssetObjectInfo>(&sql);
    if id != 0 {
        query = query.bind(id);
    }
    if let Some(ts) = &types {
        for t in ts {
            query = query.bind(t);
        }
    }
    let result = query
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}
