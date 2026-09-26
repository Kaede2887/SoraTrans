use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Deserialize, Serialize, FromRow, Clone)]
pub struct TagInfo{
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) category: String,
    pub(crate) vn_count: i64,
    pub(crate) description: String
}

