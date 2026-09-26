use std::path::PathBuf;

use crate::{
    pojo::{project_info::ProjectInfo, scan_info::ScanInfo},
    util::{get_app_info, save_icon},
};
use tokio::task::JoinHandle;

pub async fn task_worker(
    base_path: &PathBuf,
    max_thread: i32,
    vec: Vec<ScanInfo>,
) -> Vec<ProjectInfo> {
    let (tx, rx) = async_channel::bounded::<ScanInfo>(10);
    let (info_tx, info_rx) = async_channel::unbounded::<ProjectInfo>();

    let mut handles: Vec<JoinHandle<()>> = vec![];

    let mut info_vec: Vec<ProjectInfo> = vec![];

    for i in 0..max_thread {
        let rx = rx.clone();
        let base_path = base_path.clone();
        let info_tx = info_tx.clone();
        let hanlder = tokio::spawn(async move {
            while let Ok(task) = rx.recv().await {
                println!("线程{:?}正在处理游戏:{:?}", i, &task);
                let file_path = task.exe[0].path.to_owned();
                let name = task.exe[0].name.to_owned();
                let title = task.title.to_owned();
                let app_info = get_app_info::get_app_info(&file_path, name);
                let icon_path = save_icon::save_icon(&base_path, &file_path, &app_info.0);
                let info = ProjectInfo::new(title, app_info.1, icon_path, file_path, app_info.2);
                let _ = info_tx.send(info).await;
            }
        });
        handles.push(hanlder);
    }

    for entry in vec {
        tx.send(entry).await.unwrap()
    }

    drop(tx);
    drop(info_tx);

    while let Ok(info) = info_rx.recv().await {
        info_vec.push(info);
    }

    for handle in handles {
        handle.await.unwrap();
    }

    println!("所有任务处理完成!共 {} 项", info_vec.len());
    info_vec
}
