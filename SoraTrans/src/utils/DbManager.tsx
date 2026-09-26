import ProjectInfo, { useProjectInfoStore } from '@/model/ProjectInfo';
import { tagRes, VndbRes } from '@/model/Vndb';
import { info } from '@tauri-apps/plugin-log';
import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import { ScanInfo } from '@/model/ScanInfo';

class DbManager {

    db: Database | null = null;

    async insertProjectInfo(filePath: string, title: string) {
        try {
            await invoke('insert_project_info', { filePath: filePath, name: title })
            this.selectProjectInfoList()
        } catch (error) {
            info(`插入数据失败:${error}`)
        }
    }

    async selectProjectInfoList() {
        try {
            const mode = useProjectInfoStore.getState().currentSortMode
            const result = await invoke<ProjectInfo[]>("select_project_info_list", { mode: mode })
            useProjectInfoStore.getState().setInfoList(result)
        } catch (error) {
            info(`查询数据失败:${error}`);
            return;
        }
    }

    async searchProjectInfo(val: string) {
        try {
            const mode = useProjectInfoStore.getState().currentSortMode
            const result = await invoke<ProjectInfo[]>("search_project_info",{val:val,mode:mode})
            useProjectInfoStore.getState().setInfoList(result)
        } catch (error) {
            return;
        }
    }

    async insertBatchProjectInfo(selected: ScanInfo[]){
        try {
            await invoke("insert_batch_project_info",{select: selected})
            this.selectProjectInfoList()
        } catch (error) {
            return;
        }
    }

    async selectProjectInfo(id: number): Promise<ProjectInfo | null> {
        try {
            const info = await invoke<ProjectInfo>("select_project_info",{id:id})
            return info ?? null
        } catch (error) {
            info(`查询数据失败:${error}`);
            return null;
        }
    }

    async updateProjectStatus(id: number, status: number) {
        try {
            await invoke("update_project_status",{id: id, status: status})
        } catch (error) {
            info(`更新项目状态失败:${error}`);
        }
    }

    async deleteProjectInfo(id: number) {
        try {
            await invoke("delete_project_info",{id: id})
        } catch (error) {
            info(`删除数据失败:${error}`);
        }
    }

    async renameProjectInfo(id: number, title: string) {
        try {
            await invoke("rename_project_info",{title: title,id: id})
        } catch (error) {
            info(`更新数据失败:${error}`);
        }
    }

    async completeProjctInfo(id: number, db_path: string, res: VndbRes) {
        try {
            await invoke("complete_project_info",{id: id,coverPath: res.results[0]?.image.url ?? null,dbPath: db_path,rating: res.results[0]?.rating ?? null,description: res.results[0]?.description ?? null})
        } catch (error) {
            info(`补全数据失败:${error}`);
        }
    }

    async insertTag(id: number, items: tagRes[]) {
        try {
            await invoke("insert_tags",{id: id, tags: items})
        } catch (error) {
            info(`插入标签信息查询失败:${error}`);
        }
    }

    async selectGameTag(game_id: number): Promise<tagRes[]> {
        try {
            if (!this.db) return [];
            const res = await this.db.select<tagRes[]>(`
                SELECT t.* FROM game_info as gi,game_tags as gt,tags as t
                WHERE gi.id = $1
                AND gt.id = gi.id
                AND t.id = gi.id
            `, [game_id])
            return res
        } catch (error) {
            info(`游戏标签查询失败:${error}`);
            return []
        }
    }
}

const manager: DbManager = new DbManager();

export { manager }