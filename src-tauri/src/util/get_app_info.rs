use std::{
    fs::File,
    io::{BufRead, BufReader},
    path::Path,
};

use anyhow::Context;
use walkdir::WalkDir;

pub fn get_app_info(file_path: &String, name: String) -> (String, String, String) {
    let path = Path::new(file_path);
    let root_path = path.parent().context("处理root_path出错").unwrap();
    let rp = root_path
        .as_os_str()
        .to_str()
        .context("处理rp出错")
        .unwrap()
        .to_string();
    let mut title = name;
    let mut manufactor = String::new();

    for entry in WalkDir::new(root_path) {
        let Ok(entry) = entry else { continue };
        if entry.file_name().to_str() != Some("app.info") {
            continue;
        }
        if let Ok(file) = File::open(entry.path()) {
            let mut lines = BufReader::new(file).lines();
            if let Some(Ok(first)) = lines.next() {
                manufactor = first;
            }
            if let Some(Ok(second)) = lines.next() {
                title = second;
            }
        }
        break;
    }

    (title, rp, manufactor)
}
