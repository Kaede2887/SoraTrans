use anyhow::Context;
use std::{fs, path::PathBuf};
use windows_icons::{get_icon_by_path_with_size, IconSize};

pub fn save_icon(base_path: &PathBuf, file_path: &String, title: &String) -> String {
    let _icon = get_icon_by_path_with_size(file_path, IconSize::Large).unwrap();
    let out_path = base_path.join("output");
    if !out_path.exists() {
        fs::create_dir(&out_path).unwrap();
    }
    let extension = String::from(".png");
    let file_name = title.clone() + &extension;
    let icon_out_path = out_path.join(&file_name);
    if !icon_out_path.exists() {
        _icon
            .save(&icon_out_path)
            .context("处理图标存储出错")
            .unwrap();
    }
    let ip = icon_out_path
        .as_os_str()
        .to_str()
        .context("处理ip出错")
        .unwrap()
        .to_string();
    ip
}
