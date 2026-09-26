import { useAssetObjectStore } from "@/model/AssetObjectInfo"
import AssetObjTable from "./ui/asset-object-table"


export default function AssetObjectList() {

    const assetObjList = useAssetObjectStore((state) => state.assetObjList)
    const assetId = useAssetObjectStore((state) => state.assetId)
    const assetName = useAssetObjectStore((state) => state.assetName)

    return (
        <div className="w-full h-full">
            <div className="w-full h-full overflow-hidden py-2">
                <AssetObjTable list={assetObjList} name={assetName} id={assetId} />
            </div>
        </div>
    )
}