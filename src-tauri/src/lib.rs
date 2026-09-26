pub mod pojo;
pub mod util;
use pojo::{
    asset_info::AssetInfo, pattern_tree_info::PatternTreeInfo, project_info::ProjectInfo,
    scan_info::ScanInfo, scan_status::ScanStatus, tag_info::TagInfo,
    text_origin_info::TextOriginInfo,
};
use std::path::Path;
use serde::{Serialize};
use tauri::{Manager, State, WindowEvent, AppHandle, Emitter};
use util::{
    db_manager, get_app_info, get_scan_dir,
    repo::{assets, assets_object, project, tag, text_origin, text_translate},
    run_app, save_icon, worker,
};

use crate::pojo::asset_object_info::AssetObjectInfo;

#[tauri::command]
fn run_application(file_path: String) -> Result<(), String> {
    run_app::run_app(&file_path)
}

#[tauri::command]
async fn scan_info(dir: String) -> Vec<ScanInfo> {
    tokio::task::spawn_blocking(move || {
        let list = get_scan_dir::get_scan_dir(&dir);
        list
    })
    .await
    .unwrap()
}

#[tauri::command]
async fn open_folder(path: String) {
    #[cfg(target_os = "macos")]
    let command = "open";

    #[cfg(target_os = "windows")]
    let command = "explorer";

    #[cfg(target_os = "linux")]
    let command = "xdg-open";

    let parent = Path::new(&path).parent().unwrap();

    std::process::Command::new(command)
        .arg(&parent)
        .spawn()
        .map_err(|e| e.to_string())
        .unwrap();
}

#[tauri::command]
async fn get_scan_info(app: tauri::AppHandle, select: Vec<ScanInfo>) -> Vec<ProjectInfo> {
    let base_path = app.path().app_data_dir().unwrap();
    let vec = worker::task_worker(&base_path, 3, select).await;
    vec
}

#[tauri::command]
async fn insert_project_info(
    app: tauri::AppHandle,
    manager: State<'_, db_manager::DbManager>,
    file_path: String,
    name: String,
) -> Result<(), String> {
    let app_info = get_app_info::get_app_info(&file_path, name);
    let base_path = app.path().app_data_dir().unwrap();
    let icon_path = save_icon::save_icon(&base_path, &file_path, &app_info.0);
    let info = ProjectInfo::new(app_info.0, app_info.1, icon_path, file_path, app_info.2);
    project::insert_project_info(&manager, info)
        .await
        .expect("插入数据失败");
    Ok(())
}

#[tauri::command]
async fn select_project_info_list(
    manager: State<'_, db_manager::DbManager>,
    mode: String,
) -> Result<Vec<ProjectInfo>, String> {
    let list = project::select_project_info_list(&manager, mode)
        .await
        .expect("插入数据失败");
    Ok(list)
}

#[tauri::command]
async fn search_project_info(
    manager: State<'_, db_manager::DbManager>,
    val: String,
    mode: String,
) -> Result<Vec<ProjectInfo>, String> {
    let list = project::search_project_info(&manager, val, mode)
        .await
        .expect("插入数据失败");
    Ok(list)
}

#[tauri::command]
async fn insert_batch_project_info(
    manager: State<'_, db_manager::DbManager>,
    app: tauri::AppHandle,
    select: Vec<ScanInfo>,
) -> Result<(), String> {
    let base_path = app.path().app_data_dir().unwrap();
    let vec = worker::task_worker(&base_path, 3, select).await;
    let _ = project::insert_batch_project_info(&manager, vec).await;
    Ok(())
}

#[tauri::command]
async fn delete_project_info(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
) -> Result<(), String> {
    let _ = project::delete_project_info(&manager, id).await;
    Ok(())
}

#[tauri::command]
async fn rename_project_info(
    manager: State<'_, db_manager::DbManager>,
    title: String,
    id: i64,
) -> Result<(), String> {
    let _ = project::rename_project_info(&manager, title, id).await;
    Ok(())
}

#[tauri::command]
async fn init_game_info(manager: State<'_, db_manager::DbManager>, id: i64) -> Result<(), String> {
    let _ = manager.open_game(id).await;
    Ok(())
}

#[tauri::command]
async fn select_project_info(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
) -> Result<ProjectInfo, String> {
    let info = project::select_project_info(&manager, id).await?;
    Ok(info)
}

#[tauri::command]
async fn select_scan_status(
    manager: State<'_, db_manager::DbManager>,
) -> Result<ScanStatus, String> {
    let scan = assets::select_scan_status(&manager).await?;
    Ok(scan)
}

#[tauri::command]
async fn complete_project_info(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
    cover_path: Option<String>,
    db_path: String,
    rating: Option<f64>,
    description: Option<String>,
) -> Result<(), String> {
    println!("db_path: {}", db_path);
    let _ = project::complete_project_info(&manager, id, cover_path, db_path, rating, description)
        .await;
    Ok(())
}

#[tauri::command]
async fn insert_tags(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
    tags: Vec<TagInfo>,
) -> Result<(), String> {
    let _ = tag::insert_tag(&manager, id, tags).await;
    Ok(())
}

#[tauri::command]
async fn select_asset_list(
    manager: State<'_, db_manager::DbManager>,
) -> Result<Vec<AssetInfo>, String> {
    let list = assets::select_asset_list(&manager).await?;
    Ok(list)
}

#[tauri::command]
async fn select_asset_object_list(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
    sort: Option<String>,
) -> Result<Vec<AssetObjectInfo>, String> {
    let list = assets_object::select_asset_object_list(&manager, id, sort).await?;
    Ok(list)
}

#[tauri::command]
async fn select_pattern_tree(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
) -> Result<Vec<PatternTreeInfo>, String> {
    let result = text_origin::select_pattern_tree(&manager, id).await?;
    Ok(result)
}

#[tauri::command]
async fn select_text_all(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
    sort: Option<String>,
) -> Result<Vec<TextOriginInfo>, String> {
    let result = text_origin::select_text_all(&manager, id, sort).await?;
    Ok(result)
}

#[tauri::command]
async fn select_text_by_pattern_id(
    manager: State<'_, db_manager::DbManager>,
    pattern_id: i64,
    object_id: i64,
    sort: Option<String>,
) -> Result<Vec<TextOriginInfo>, String> {
    let result =
        text_origin::select_text_by_pattern_id(&manager, pattern_id, object_id, sort).await?;
    Ok(result)
}

#[tauri::command]
async fn search_asset_obj_by_name(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
    val: String,
    sort: Option<String>,
) -> Result<Vec<AssetObjectInfo>, String> {
    let list = assets_object::search_asset_obj_by_name(&manager, id, val, sort).await?;
    Ok(list)
}

#[tauri::command]
async fn search_text(
    manager: State<'_, db_manager::DbManager>,
    id: i64,
    val: String,
    sort: Option<String>,
) -> Result<Vec<TextOriginInfo>, String> {
    let list = text_origin::search_text(&manager, id, val, sort).await?;
    Ok(list)
}

#[tauri::command]
async fn search_text_with_pattern_id(
    manager: State<'_, db_manager::DbManager>,
    pattern_id: i64,
    object_id: i64,
    val: String,
    sort: Option<String>,
) -> Result<Vec<TextOriginInfo>, String> {
    let list = text_origin::search_text_with_pattern_id(&manager, pattern_id, object_id, val, sort)
        .await?;
    Ok(list)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SetModInfo<'a> {
  id: &'a i64
}

#[tauri::command]
async fn insert_trans(
    app: AppHandle,
    manager: State<'_, db_manager::DbManager>,
    object_id: i64,
    origin_id: i64,
    val: String,
) -> Result<(), String> {
    let _ = app.emit("setMod", SetModInfo {id: &object_id} ).unwrap();
    let _ = text_translate::insert_trans(&manager, origin_id, val).await?;
    Ok(())
}

#[tauri::command]
async fn insert_batch_trans(
    app: AppHandle,
    manager: State<'_, db_manager::DbManager>,
    object_id: i64,
    list: Vec<TextOriginInfo>,
) -> Result<(), String> {
    let _ = app.emit("setMod", SetModInfo {id: &object_id}).unwrap();
    let _ = text_translate::insert_batch_trans(&manager, list).await?;
    Ok(())
}

async fn close_all_db(manager: &db_manager::DbManager) -> Result<(), String> {
    manager.close().await;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let manager = db_manager::DbManager::new();
    let manager_for_setup = manager.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(manager)
        .setup(move |app| {
            let manager = manager_for_setup.clone();

            // 给初始化协程单独一份
            let init_manager = manager.clone();

            tauri::async_runtime::block_on(async move {
                if let Err(e) = init_manager.init().await {
                    eprintln!("数据库初始化失败: {}", e);
                }
            });

            let main_window = app.get_webview_window("main").unwrap();
            let app_handle = app.handle().clone();

            main_window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();

                    for (label, window) in app_handle.webview_windows() {
                        if label != "main" {
                            let _ = window.destroy();
                        }
                    }

                    tauri::async_runtime::block_on(async {
                        if let Err(e) = close_all_db(&manager).await {
                            eprintln!("关闭数据库失败: {}", e);
                        }
                    });

                    if let Some(main) = app_handle.get_webview_window("main") {
                        let _ = main.destroy();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_application,
            scan_info,
            open_folder,
            get_scan_info,
            insert_project_info,
            select_project_info_list,
            select_project_info,
            search_project_info,
            insert_batch_project_info,
            delete_project_info,
            rename_project_info,
            init_game_info,
            select_scan_status,
            complete_project_info,
            insert_tags,
            select_asset_list,
            select_asset_object_list,
            select_pattern_tree,
            select_text_all,
            select_text_by_pattern_id,
            search_asset_obj_by_name,
            search_text,
            search_text_with_pattern_id,
            insert_trans,
            insert_batch_trans
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
