import { useAssetObjectStore } from "@/model/AssetObjectInfo"
import { useProjectInfoStore } from "@/model/ProjectInfo"
import { useFileTreeStore, FileTreeItem } from "@/components/FileTree"
import { gm } from "@/utils/GameDbManager"
import { useStore } from "zustand"
import { useMemo } from "react"
import AssetObjTable from "./ui/asset-object-table"

// 把树结构展平为 (id, name) 列表，供下拉选择
function flattenAssets(items: FileTreeItem[]): { id: number, name: string }[] {
    const out: { id: number, name: string }[] = []
    const walk = (list: FileTreeItem[]) => {
        for (const item of list) {
            if ("items" in item) {
                walk(item.items)
            } else {
                out.push({ id: item.id, name: item.name })
            }
        }
    }
    walk(items)
    return out
}

export default function AssetObjectList() {

    const assetObjList = useAssetObjectStore((state) => state.assetObjList)
    const assetId = useAssetObjectStore((state) => state.assetId)
    const current = useProjectInfoStore((state) => state.current)
    const infoList = useProjectInfoStore((state) => state.infoList)
    const fileList = useStore(useFileTreeStore, (state) => state.list)

    const flatAssets = useMemo(() => flattenAssets(fileList), [fileList])

    const gameTitle = infoList.find(i => i.id === current)?.title ?? "全部资源"

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value)
        if (id === 0) {
            useAssetObjectStore.getState().setAssetId(0)
            useAssetObjectStore.getState().setAssetName("")
        } else {
            const asset = flatAssets.find(a => a.id === id)
            useAssetObjectStore.getState().setAssetId(id)
            useAssetObjectStore.getState().setAssetName(asset?.name ?? "")
        }
        const currentSort = useAssetObjectStore.getState().currentSort
        gm.selectAssetObjectList(id, currentSort)
    }

    return (
        <div className="w-full h-full">
            <div className="w-full h-full overflow-hidden py-2">
                <AssetObjTable list={assetObjList} name={gameTitle} id={assetId}
                    assetSelector={{ assets: flatAssets, selectedId: assetId, onSelect: handleSelect }}
                />
            </div>
        </div>
    )
}
