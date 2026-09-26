use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Deserialize, Serialize, FromRow, Clone)]
pub struct ScanStatus{
    total: i64,
    scanned: i64,
    line: i64
}