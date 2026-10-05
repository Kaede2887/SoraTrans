use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

/// 再提取模板：前端批量回写入参 / 按 id 查询模板的返回行
#[derive(Debug, Deserialize, Serialize, FromRow)]
pub struct TextTemplateInfo {
    pub id: i64,
    pub text_template: String,
}
