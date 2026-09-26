use crate::{
    pojo::{pattern_tree_info::PatternTreeInfo, text_origin_info::TextOriginInfo},
    util::db_manager::DbManager,
};

pub async fn select_pattern_tree(
    manager: &DbManager,
    id: i64,
) -> Result<Vec<PatternTreeInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let result = sqlx::query_as::<_, PatternTreeInfo>(
        r#"
            SELECT
                text_pattern.id,
                text_pattern.semantic,
                COUNT(text_origin.id) AS count
            FROM text_pattern
            INNER JOIN text_origin
                ON text_origin.pattern_id = text_pattern.id
            WHERE text_origin.object_id = ?
            GROUP BY
                text_pattern.id,
                text_pattern.semantic;
        "#,
    )
    .bind(id)
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn select_text_all(
    manager: &DbManager,
    id: i64,
    sort: Option<String>,
) -> Result<Vec<TextOriginInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let sql = format!(
        r#"
            SELECT tor.id,tor.text as origin_text,tt.text as trans_text FROM text_origin as tor
            LEFT JOIN text_translate as tt
            ON tt.origin_id = tor.id
            WHERE tor.object_id = ?
            {}
        "#,
        sort.unwrap_or_default()
    );

    let result = sqlx::query_as::<_, TextOriginInfo>(&sql)
        .bind(id)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn select_text_by_pattern_id(
    manager: &DbManager,
    pattern_id: i64,
    obj_id: i64,
    sort: Option<String>,
) -> Result<Vec<TextOriginInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let sql = format!(
        r#"
            SELECT tor.id,tor.text as origin_text,tt.text as trans_text FROM text_origin as tor
            LEFT JOIN text_translate as tt
            ON tt.origin_id = tor.id
            WHERE tor.object_id = ?
            AND tor.pattern_id = ?
            {}
        "#,
        sort.unwrap_or_default()
    );

    let result = sqlx::query_as::<_, TextOriginInfo>(&sql)
        .bind(obj_id)
        .bind(pattern_id)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn search_text(
    manager: &DbManager,
    id: i64,
    val: String,
    sort: Option<String>,
) -> Result<Vec<TextOriginInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let sql = format!(
        r#"
            SELECT tor.id,tor.text as origin_text,tt.text as trans_text FROM text_origin as tor
            LEFT JOIN text_translate as tt
            ON tt.origin_id = tor.id
            WHERE object_id = ?
            AND tor.text LIKE '%{}%'
            OR tt.text LIKE '%{}%'
            {}    
        "#,
        val,
        val,
        sort.unwrap_or_default()
    );

    let result = sqlx::query_as::<_, TextOriginInfo>(&sql)
        .bind(id)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn search_text_with_pattern_id(
    manager: &DbManager,
    pattern_id: i64,
    obj_id: i64,
    val: String,
    sort: Option<String>,
) -> Result<Vec<TextOriginInfo>, String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let sql = format!(
        r#"
            SELECT tor.id,tor.text as origin_text,tt.text as trans_text FROM text_origin as tor
            LEFT JOIN text_translate as tt
            ON tt.origin_id = tor.id
            WHERE tor.object_id = ?
            AND tor.pattern_id = ?
            AND tor.text LIKE '%{}%'
            OR tt.text LIKE '%{}%'
            {}     
        "#,
        val,
        val,
        sort.unwrap_or_default()
    );

    let result = sqlx::query_as::<_, TextOriginInfo>(&sql)
        .bind(obj_id)
        .bind(pattern_id)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}
