use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions},
};
use tokio::sync::RwLock;

/// SQLite 数据库管理器
/// 负责管理：
/// 1. soratrans.db
/// 2. game/{game_id}.db
/// 所有窗口都通过 Tauri command -> DbManager 操作数据库。
/// 前端不要再使用：
/// Database.load("sqlite:game/xxx.db")
#[derive(Clone)]
pub struct DbManager {
    inner: Arc<RwLock<DbManagerInner>>,
}

struct DbManagerInner {
    /// SoraTrans 主数据库
    sora_db: Option<SqlitePool>,

    /// Game 数据库
    /// game_id -> SqlitePool
    game_db: Option<(i64, SqlitePool)>,
}

impl DbManager {
    /// 创建 DbManager
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(DbManagerInner {
                sora_db: None,
                game_db: None,
            })),
        }
    }

    // ============================================================
    // 路径
    // ============================================================
    /// 获取 SoraTrans 数据目录
    /// Windows:
    /// %APPDATA%/SoraTrans
    /// Linux:
    /// ~/.local/share/SoraTrans
    /// macOS:
    /// ~/Library/Application Support/SoraTrans
    fn app_data_dir() -> Result<PathBuf, String> {
        let path = dirs::data_dir().ok_or_else(|| "无法获取系统 AppData 目录".to_string())?;

        Ok(path.join("SoraTrans"))
    }

    /// soratrans.db
    fn sora_db_path() -> Result<PathBuf, String> {
        Ok(Self::app_data_dir()?.join("soratrans.db"))
    }

    /// game/{id}.db
    pub fn game_db_path(game_id: i64) -> Result<PathBuf, String> {
        if game_id <= 0 {
            return Err(format!("非法 game_id: {}", game_id));
        }

        Ok(Self::app_data_dir()?
            .join("game")
            .join(format!("game{}.db", game_id)))
    }

    // ============================================================
    // SQLite
    // ============================================================
    /// 创建 SQLite 连接池
    async fn create_pool(path: &Path) -> Result<SqlitePool, String> {
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("创建数据库目录失败: {}: {}", parent.display(), e))?;
        }

        let path_string = path.to_string_lossy().to_string();

        let options = SqliteConnectOptions::new()
            .filename(&path_string)
            .create_if_missing(true)
            .foreign_keys(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .busy_timeout(Duration::from_secs(10));

        let pool = SqlitePoolOptions::new()
            // 一个 DbManager 不需要开非常多 SQLite connection。
            // SQLite 本身写入仍然是串行的。
            .max_connections(4)
            .min_connections(1)
            .acquire_timeout(Duration::from_secs(15))
            .connect_with(options)
            .await
            .map_err(|e| format!("打开 SQLite 数据库失败: {}: {}", path.display(), e));

        pool
    }

    // ============================================================
    // 初始化
    // ============================================================
    /// 初始化 SoraTrans 主数据库
    /// 应用启动时调用一次。
    pub async fn init(&self) -> Result<(), String> {
        println!("========== DbManager::init 开始 ==========");
        let result = self.open_sora_db().await;
        println!("========== DbManager::init 结束: {:?} ==========", result);

        result
    }

    /// 打开 soratrans.db
    pub async fn open_sora_db(&self) -> Result<(), String> {
        {
            let inner = self.inner.read().await;

            if inner.sora_db.is_some() {
                return Ok(());
            }
        }

        let path = Self::sora_db_path()?;

        let pool = Self::create_pool(&path).await?;

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .map_err(|e| format!("执行数据库迁移失败: {}", e))?;

        // double check
        let mut inner = self.inner.write().await;

        if inner.sora_db.is_none() {
            inner.sora_db = Some(pool);
        }

        Ok(())
    }

    // ============================================================
    // Sora DB
    // ============================================================
    /// 获取 SoraTrans 数据库
    /// Repository 使用。
    pub async fn sora_db(&self) -> Result<SqlitePool, String> {
        let inner = self.inner.read().await;

        inner
            .sora_db
            .clone()
            .ok_or_else(|| "SoraTrans 数据库尚未初始化".to_string())
    }

    // ============================================================
    // Game DB
    // ============================================================
    /// 打开一个 Game DB
    /// -> %APPDATA%/SoraTrans/game/game123.db
    pub async fn open_game(&self, game_id: i64) -> Result<(), String> {
        let current_game_id = {
            let inner = self.inner.read().await;
            inner.game_db.as_ref().map(|(id, _)| *id)
        };

        // 已经打开这个游戏
        if current_game_id == Some(game_id) {
            return Ok(());
        }

        // 已经打开其他游戏
        if current_game_id.is_some() {
            self.close_game().await?;
        }

        let path = Self::game_db_path(game_id)?;

        let pool = Self::create_pool(&path).await?;

        // 不需要自己判断文件是否存在
        sqlx::migrate!("./game_migrations")
            .run(&pool)
            .await
            .map_err(|e| format!("执行数据库迁移失败: {}", e))?;

        let mut inner = self.inner.write().await;

        if inner.game_db.is_none() {
            inner.game_db = Some((game_id, pool));
        } else {
            // 理论上不会发生
            drop(inner);
            pool.close().await;
        }

        Ok(())
    }

    /// 获取 Game DB
    /// Repository 使用。
    pub async fn game_db(&self) -> Result<SqlitePool, String> {
        let inner = self.inner.read().await;

        inner
            .game_db
            .as_ref()
            .map(|(_, pool)| pool.clone())
            .ok_or_else(|| "Game 数据库尚未初始化".to_string())
    }

    /// 判断 Game DB 是否已经打开
    pub async fn is_game_open(&self, game_id: i64) -> bool {
        let inner = self.inner.read().await;

        matches!(
            inner.game_db.as_ref(),
            Some((id, _)) if *id == game_id
        )
    }

    /// 关闭 Game DB
    pub async fn close_game(&self) -> Result<(), String> {
        let pool = {
            let mut inner = self.inner.write().await;
            inner.game_db.take().map(|(_, pool)| pool)
        };

        if let Some(pool) = pool {
            pool.close().await;
        }

        Ok(())
    }

    /// 关闭整个 DbManager
    pub async fn close(&self) {
        let (sora_db, game_db) = {
            let mut inner = self.inner.write().await;
            let sora_db = inner.sora_db.take();
            let game_db = inner.game_db.take();
            (sora_db, game_db)
        };

        if let Some(pool) = sora_db {
            pool.close().await;
        }

        if let Some((_,pool)) = game_db {
            pool.close().await;
        }
    }
}

impl Default for DbManager {
    fn default() -> Self {
        Self::new()
    }
}
