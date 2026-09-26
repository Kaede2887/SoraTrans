use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct ScanInfo {
    id: i32,
    pub(crate) title: String,
    pub(crate) exe: Vec<ExeInfo>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ExeInfo {
    pub(crate) name: String,
    pub(crate) path: String,
}

impl ExeInfo {
    pub fn new(name: String, path: String) -> ExeInfo {
        ExeInfo {
            name: name,
            path: path,
        }
    }
}

impl ScanInfo {
    pub fn new(id: i32, title: String, exe: Vec<ExeInfo>) -> ScanInfo {
        ScanInfo {
            id: id,
            title: title,
            exe: exe,
        }
    }
}
