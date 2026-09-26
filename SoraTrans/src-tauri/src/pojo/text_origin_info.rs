use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Deserialize, Serialize, FromRow, Clone)]
pub struct TextOriginInfo{
    pub(crate) id: i64,
    origin_text: String,
    pub(crate) trans_text: String
}