use crate::{pojo::text_origin_info::TextOriginInfo, util::db_manager::DbManager};

pub async fn insert_trans(manager: &DbManager, id: i64, val: String) -> Result<(), String> {
    let db = manager.game_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let _result = sqlx::query(
        r#"
            INSERT INTO text_translate (origin_id,text)
            VALUES (?,?)
            ON CONFLICT(origin_id) DO UPDATE SET text = ?;
        "#
    )
        .bind(id)
        .bind(&val)
        .bind(&val)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn insert_batch_trans(manager: &DbManager,list: Vec<TextOriginInfo>) -> Result<(), String>{
    let db = manager.game_db().await?;
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    for item in list {
        if item.trans_text == "" {
            continue;
        }
        let _result = sqlx::query(
            r#"
                INSERT INTO text_translate (origin_id,text)
                VALUES (?,?)
                ON CONFLICT(origin_id) DO UPDATE SET text = ?;
            "#
        ).bind(item.id)
        .bind(&item.trans_text)
        .bind(&item.trans_text)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}
