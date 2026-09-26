use std::fs;

use crate::{db_manager::DbManager, pojo::project_info::ProjectInfo};

pub async fn insert_project_info(manager: &DbManager, info: ProjectInfo) -> Result<(), String> {
    let db = manager.sora_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    let _result = sqlx::query(
        r#"
            INSERT INTO project_info (
                title, root_path, icon_path, 
                file_path,manufactor
            ) VALUES (?,?,?,?,?)
        "#,
    )
    .bind(info.title)
    .bind(info.root_path)
    .bind(info.icon_path)
    .bind(info.file_path)
    .bind(info.manufactor)
    .execute(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn select_project_info(manager: &DbManager, id: i64) -> Result<ProjectInfo, String> {
    let db = manager.sora_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    let sql = format!(
        r#"
            SELECT * FROM project_info 
            WHERE id = ?;   
        "#
    );
    let result = sqlx::query_as::<_, ProjectInfo>(&sql)
        .bind(id)
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn select_project_info_list(
    manager: &DbManager,
    mode: String,
) -> Result<Vec<ProjectInfo>, String> {
    let db = manager.sora_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    let sql = format!(
        r#"
            SELECT *
            FROM project_info
            ORDER BY {}
        "#,
        mode
    );
    let result = sqlx::query_as::<_, ProjectInfo>(&sql)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn search_project_info(
    manager: &DbManager,
    val: String,
    mode: String,
) -> Result<Vec<ProjectInfo>, String> {
    let db = manager.sora_db().await?;
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
    let sql = format!(
        r#"
            SELECT * FROM project_info
            WHERE title LIKE '%{}%'
            OR manufactor LIKE '%{}%'
            ORDER BY {};   
        "#,
        val, val, mode
    );
    let result = sqlx::query_as::<_, ProjectInfo>(&sql)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn insert_batch_project_info(
    manager: &DbManager,
    vec: Vec<ProjectInfo>,
) -> Result<(), String> {
    let db = manager.sora_db().await?;

    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    for (index, info) in vec.into_iter().enumerate() {
        let _result = sqlx::query(
            r#"
                INSERT OR IGNORE INTO project_info (
                    title, root_path, icon_path, 
                    file_path,manufactor
                ) VALUES (?,?,?,?,?)
            "#,
        )
        .bind(info.title)
        .bind(info.root_path)
        .bind(info.icon_path)
        .bind(info.file_path)
        .bind(info.manufactor)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            println!("批量插入第 {} 条失败: {}", index, e);
            e.to_string()
        })?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn delete_project_info(manager: &DbManager, id: i64) -> Result<(), String> {
    let db = manager.sora_db().await?;
    // 开启事务
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM game_tags WHERE project_id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM project_info WHERE id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    // 关闭项目数据库
    if manager.is_game_open(id).await {
        manager.close_game().await?;
    }

    // 删除项目对应的 SQLite 文件
    let path = DbManager::game_db_path(id)?;

    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub async fn rename_project_info(manager: &DbManager, val: String, id: i64) -> Result<(), String> {
    let db = manager.sora_db().await?;

    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    sqlx::query("UPDATE project_info SET title = ? WHERE id = ? ")
        .bind(val)
        .bind(id)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn complete_project_info(
    manager: &DbManager,
    id: i64,
    cover_path: Option<String>,
    db_path: String,
    rating: Option<f64>,
    description: Option<String>
) -> Result<(), String> {
    let db = manager.sora_db().await?;

    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE project_info 
        SET cover_path = ?,
            db_path = ?,
            rating = ?,
            description = ?,
            update_time = (DATETIME('now', 'localtime')),
            status = 1 
        WHERE id = ? "#,
    )
        .bind(cover_path)
        .bind(db_path)
        .bind(rating)
        .bind(description)
        .bind(id)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
