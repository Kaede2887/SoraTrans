import { useFileTreeStore } from "@/components/FileTree";
import { gm } from "@/utils/GameDbManager";
import { useEffect } from "react";
import AssetObjectList from "@/components/AssetObjectList";
import TranslateToolBar from "@/components/TranlateToolBar";

export default function TranslateView() {

    useEffect(() => {
        if (useFileTreeStore.getState().list.length === 0) {
            gm.selectAssetList();
        }
    }, [])

    return (
        <div className="w-full h-full flex gap-2 px-2 pb-2 overflow-hidden">
            <div className="w-[75%] bg-white rounded-sm h-full">
                <AssetObjectList />
            </div>
            <div className="w-[25%] bg-white rounded-sm h-full">
                <TranslateToolBar />
            </div>
        </div>
    )
}
