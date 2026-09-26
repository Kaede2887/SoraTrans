import { info } from '@tauri-apps/plugin-log';
import Database from '@tauri-apps/plugin-sql';
import * as path from '@tauri-apps/api/path';
import AssetInfo from '@/model/AssetInfo';
import { FileTreeItem, useFileTreeStore } from '@/components/FileTree';
import AssetObjectInfo, { useAssetObjectStore } from '@/model/AssetObjectInfo';
import { TextOrigin, useTextOriginStore } from '@/model/TextOrigin';
import { invoke } from '@tauri-apps/api/core';

enum AssetObjSortMethod {
    NameUp = "ORDER BY name ASC",
    NameDown = "ORDER BY name DESC",
    TypeUp = "ORDER BY type ASC",
    TypeDown = "ORDER BY type DESC",
    PathIdUp = "ORDER BY path_id ASC",
    PathIdDown = "ORDER BY path_id DESC",
    SizeUp = "ORDER BY size ASC",
    SizeDown = "ORDER BY size DESC",
    LineUp = "ORDER BY line_count ASC",
    LineDown = "ORDER BY line_count DESC",
    ModDown = "ORDER BY mod DESC"
}

enum TextOriginSortMethod {
    IdUp = "ORDER BY tor.id ASC",
    IdDown = "ORDER BY tor.id DESC",
    OriginUp = "ORDER BY tor.text ASC",
    OriginDown = "ORDER BY tor.text DESC",
    TransUp = "ORDER BY tt.text ASC",
    TransDown = "ORDER BY tt.text DESC"
}

class GameDbManager {

    db: Database | null = null;

    async init(id: number): Promise<string> {
        try {
            await invoke("init_game_info",{id: id});
            const appPath = await path.appDataDir();
            const dbPath = await path.join(appPath, 'game', `game${id}.db`);
            return dbPath
        } catch (error) {
            info(`数据库初始化失败:${error}`)
            return ""
        }
    }

    async selectScanStatus(): Promise<ScanStatus | null> {
        try {
            const status = await invoke<ScanStatus>("select_scan_status")
            return status
        } catch (error) {
            info(`查询扫描状态失败:${error}`)
            return null
        }
    }

    async selectAssetList(): Promise<void> {
        try {

            const res = await invoke<AssetInfo[]>("select_asset_list")
            const fileTreeMap = new Map<string, FileTreeItem>();

            for (const info of res) {
                if (info.parent_bundle_name) {
                    let fileItem = fileTreeMap.get(info.parent_bundle_name);

                    if (!fileItem) {
                        fileItem = {
                            id: 0,
                            name: info.parent_bundle_name,
                            line: 0,
                            items: []
                        };

                        fileTreeMap.set(info.parent_bundle_name, fileItem);
                    }

                    fileItem.line += info.line_count;

                    (fileItem as { name: string; items: FileTreeItem[] }).items.push({ id: info.id, name: info.name, line: info.line_count });
                } else {
                    if (!fileTreeMap.has(info.name)) {
                        fileTreeMap.set(info.name, {
                            id: info.id,
                            name: info.name,
                            line: info.line_count
                        });
                    }
                }
            }

            useFileTreeStore.getState().setList([...fileTreeMap.values()])
        } catch (error) {
            return;
        }
    }

    async selectAssetObjectList(id: number, sort?: AssetObjSortMethod | null): Promise<void> {
        try {
            if (sort == AssetObjSortMethod.ModDown) {
                useAssetObjectStore.getState().sortListByMod()
            } else {
                const res = await invoke<AssetObjectInfo[]>("select_asset_object_list",{id:id,sort: sort})
                useAssetObjectStore.getState().setAssetObjList(res);
            }
            
        } catch (error) {
            return;
        }
    }

    async selectPatternTree(id: number) {
        try {
            const resList = await invoke<{ id: number, semantic: string, count: number }[]>("select_pattern_tree",{id:id})
            const rootMap = new Map<string, FileTreeItem>();
            for (let res of resList) {
                let parts = res.semantic.split(".");
                this.insertTreeNode(rootMap, parts, res)
            }
            return Array.from(rootMap.values());
        } catch (error) {
            console.error(`获取树失败，${error}`)
        }
    }

    async selectTextAll(objId: number, sort?: TextOriginSortMethod | null) {
        try {
            const res = await invoke<TextOrigin[]>("select_text_all",{id:objId,sort:sort})
            useTextOriginStore.getState().setList(res)
        } catch (error) {
            console.log(`${error}`)
        }
    }

    async selectTextByPatternId(patternId: number, sort?: TextOriginSortMethod | null) {
        try {
            const objId = useAssetObjectStore.getState().id
            const res = await invoke<TextOrigin[]>("select_text_by_pattern_id",{patternId: patternId,objectId: objId,sort: sort})

            useTextOriginStore.getState().setList(res)
        } catch (error) {
            console.log(`${error}`)
        }
    }

    private insertTreeNode(
        map: Map<string, FileTreeItem>,
        parts: string[],
        res: {
            id: number;
            semantic: string;
            count: number;
        },
        depth = 0,
        isLast = false
    ) {
        if (depth >= parts.length) {
            return;
        }

        if (depth === parts.length - 1) {
            isLast = true
        }

        const name = parts[depth];

        let node = map.get(name);

        if (!node) {
            if (!isLast) {
                node = {
                    id: 0,
                    name: name,
                    line: 0,
                    items: []
                }
            } else {
                node = {
                    id: 0,
                    name: name,
                    line: 0
                }
            }
            map.set(name, node)
        }

        node.line += res.count;

        if (depth === parts.length - 1) {
            node.id = res.id;
            return;
        }

        const childMap = new Map<string, FileTreeItem>();

        let newNode = node as { id: number; name: string; line: number; items: FileTreeItem[] }

        // 把现有 children 转成 Map，方便查找
        for (const child of newNode.items ?? []) {
            childMap.set(child.name, child);
        }

        this.insertTreeNode(
            childMap,
            parts,
            res,
            depth + 1,
            isLast
        );

        newNode.items = Array.from(childMap.values());
    }

    async searchAssetObjByName(id: number, val: string, sort?: AssetObjSortMethod | null): Promise<void> {
        try {
            const res = await invoke<AssetObjectInfo[]>("search_asset_obj_by_name",{id:id,val:val,sort:sort})
            
            useAssetObjectStore.getState().setAssetObjList(res);
        } catch (error) {
            return;
        }
    }

    async searchText(id: number, val: string, sort?: TextOriginSortMethod | null): Promise<void> {
        try {
            const res = await invoke<TextOrigin[]>("search_text",{id:id,val: val, sort:sort})
            useTextOriginStore.getState().setList(res)
        } catch (error) {
            return;
        }
    }

    async searchTextWithPatternId(patternId: number, val: string, sort?: TextOriginSortMethod | null): Promise<void> {
        try {
            const objId = useAssetObjectStore.getState().id
            const res = await invoke<TextOrigin[]>("search_text_with_pattern_id",{patternId: patternId,objectId: objId,val: val,sort: sort})
            
            useTextOriginStore.getState().setList(res)
        } catch (error) {
            return;
        }
    }

    async insertTrans(originId: number, val: string) {
        try {
            const objId = useAssetObjectStore.getState().id
            await invoke("insert_trans",{objectId: objId,originId:originId,val:val})
        } catch (error) {
            return;
        }
    }

    async insertBatchTrans(list: TextOrigin[]) {
        try {
            const objId = useAssetObjectStore.getState().id
            await invoke("insert_batch_trans",{objectId: objId,list:list})
        } catch (error) {
            return;
        }
    }
}

const gm: GameDbManager = new GameDbManager();

export { gm }
export type { GameDbManager }
export { AssetObjSortMethod, TextOriginSortMethod }