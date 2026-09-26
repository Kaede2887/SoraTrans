use std::{fs, ops::Add, path::Path};
use walkdir::WalkDir;

use crate::pojo::scan_info::{ExeInfo, ScanInfo};

pub fn get_scan_dir(dir: &String) -> Vec<ScanInfo> {
    let mut task_vec: Vec<ScanInfo> = vec![];
    let mut iter = WalkDir::new(dir).into_iter();
    let mut id = 1;
    while let Some(entry) = iter.next() {
        let entry = match entry {
            Ok(entry) => entry,
            Err(e) => {
                eprintln!("扫描失败: {e}");
                continue;
            }
        };

        if !entry.file_type().is_dir() {
            continue;
        }

        let dir = entry.path().to_path_buf();

        if let Some(info) = has_data_dir(&dir) {
            let info = ScanInfo::new(id, info.0, info.1);
            task_vec.push(info);
            id = id.add(1);
            iter.skip_current_dir();
        }
    }
    task_vec
}

fn has_data_dir(dir: &Path) -> Option<(String, Vec<ExeInfo>)> {
    let entries = fs::read_dir(dir).ok()?;

    let mut data_exe: Option<ExeInfo> = None;
    let mut other_exe: Vec<ExeInfo> = Vec::new();
    let mut title = String::new();

    for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let extension = path.extension().and_then(|x| x.to_str());

        if !extension.is_some_and(|x| x.eq_ignore_ascii_case("exe")) {
            continue;
        }

        let name = path.file_stem().and_then(|x| x.to_str())?;

        let data_dir = dir.join(format!("{name}_Data"));

        if data_dir.is_dir() {
            title = name.to_string();
            let filename = path.file_name().unwrap().to_string_lossy().into_owned();
            let path = path.to_string_lossy().into_owned();
            let exe_info = ExeInfo::new(filename, path);
            data_exe = Some(exe_info);
        } else {
            let filename = path.file_name().unwrap().to_string_lossy().into_owned();
            let path = path.to_string_lossy().into_owned();
            let exe_info = ExeInfo::new(filename, path);
            other_exe.push(exe_info);
        }
    }

    if data_exe.is_none() {
        return None;
    }

    let mut exe = Vec::new();

    if let Some(path) = data_exe {
        exe.push(path);
    }

    exe.extend(other_exe);

    Some((title, exe))
}
