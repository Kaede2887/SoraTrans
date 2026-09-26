use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Deserialize, Serialize, FromRow, Clone)]
pub struct PatternTreeInfo{
    id: i64,
    semantic: String,
    count: i64
}