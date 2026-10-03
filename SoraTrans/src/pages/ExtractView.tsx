import ExtractLog from "@/components/ExtractLog";
import ExtractProgress from "@/components/ExtractProgress";
import ExtractRecentFile from "@/components/ExtractRecentFile";
import ExtractToolBar from "@/components/ExtractToolBar";
import { gm } from "@/utils/GameDbManager";
import { useExtractProgressTable } from "@/utils/useExtractProgress";
import { useEffect } from "react";


export default function ExtractView({title, id}:{title:string, id: number | null}) {

    useEffect(()=>{
        // id 由 Editor 在 gm.init 完成后才 setId，因此 id 非空即代表游戏库已就绪；
        // 若在 init 完成前就查询，select_scan_status 会报"Game 数据库尚未初始化"
        if (id == null) return;

        const handleScan = async () => {
            const status = await gm.selectScanStatus();
            console.log("status查询")
            console.log(`handle:  ${JSON.stringify(status)}`)
            if (!status) return;
            const val = Math.ceil(status.scanned * 100.0 / status.total); 
            useExtractProgressTable.getState().setVal(val);
            useExtractProgressTable.getState().setTotal(status.total ?? 0);
            useExtractProgressTable.getState().setScanned(status.scanned ?? 0);
            useExtractProgressTable.getState().setTotalResult(status.line ?? 0);
        }

        handleScan()
    },[id])

    return (
        <div className="w-full h-full flex flex-col gap-2 px-4 pb-2 overflow-hidden">
            <ExtractToolBar title={title} id={id}/>
            <div className="w-full flex-1 flex gap-2">
                <ExtractProgress />
                <div className="w-2/5 h-full gap-2 flex flex-col">
                    <ExtractLog />
                    <ExtractRecentFile />
                </div>
            </div>
        </div>
    )
}