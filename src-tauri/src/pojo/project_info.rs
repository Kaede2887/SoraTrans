use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Deserialize, Serialize, FromRow, Clone)]
pub struct ProjectInfo {
    id: Option<i64>,
    pub(crate) title: String,
    pub(crate) root_path: String,
    pub(crate) icon_path: String,
    pub(crate) file_path: String,
    pub(crate) manufactor: String,
    db_path: Option<String>,
    cover_path: Option<String>,
    rating: Option<f64>,
    description: Option<String>,
    status: Option<i64>,
    create_time: Option<String>,
    update_time: Option<String>,
}

impl ProjectInfo {
    pub fn new(
        title: String,
        root_path: String,
        icon_path: String,
        file_path: String,
        manufactor: String,
    ) -> ProjectInfo {

        ProjectInfo {
            id: None,
            title: title,
            root_path: root_path,
            icon_path: icon_path,
            file_path: file_path,
            manufactor: manufactor,
            db_path: None,
            cover_path: None,
            rating: None,
            description: None,
            status: None,
            create_time: None,
            update_time: None,
        }
    }
}
