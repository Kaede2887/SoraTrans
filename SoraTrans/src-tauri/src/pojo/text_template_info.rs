use serde::Deserialize;

/// 再提取模板批量回写入参
#[derive(Debug, Deserialize)]
pub struct TextTemplateInfo {
    pub id: i64,
    pub text_template: String,
}
