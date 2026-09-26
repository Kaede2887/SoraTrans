use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Deserialize, Serialize, FromRow, Clone)]
pub struct AssetInfo{
    id: i64,
    name: String,
    size: String,
    path: String,
    status: i64,
    line_count: i64,
    parent_bundle_name: String
}