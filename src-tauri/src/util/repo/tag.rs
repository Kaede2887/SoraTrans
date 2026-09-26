use crate::{
    pojo::tag_info::TagInfo,
    util::db_manager::DbManager,
};

pub async fn insert_tag(
    manager: &DbManager,
    id: i64,
    tags: Vec<TagInfo>,
) -> Result<(), String> {
    let db = manager.sora_db().await?;

    let mut tx = db
        .begin()
        .await
        .map_err(|e| e.to_string())?;
    for tag in tags {
        let _ = sqlx::query(
            r#"
            INSERT OR IGNORE INTO tags
                (id, name, category, vn_count, description)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(&tag.id)
        .bind(&tag.name)
        .bind(&tag.category)
        .bind(&tag.vn_count)
        .bind(&tag.description)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let _ = sqlx::query(
            r#"
            INSERT OR IGNORE INTO game_tags (project_id, tags_id)
            VALUES (?, ?)
            "#,
        )
        .bind(id)
        .bind(&tag.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
