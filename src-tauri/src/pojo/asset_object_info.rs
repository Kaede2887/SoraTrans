use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Deserialize, Serialize, FromRow, Clone)]
pub struct AssetObjectInfo{
    id: i64,
    name: String,
    r#type: String,
    path_id: i64,
    size: i64,
    line_count: i64,
}