import { FiPlay } from "react-icons/fi";
import { PiPause } from "react-icons/pi";
import ScanStatus from "./ScanStatus";
import { useState } from "react";
import { useExtractProgressTable } from "@/utils/useExtractProgress";
import { gm } from "@/utils/GameDbManager";
import { manager } from "@/utils/DbManager";
import { assetApi } from "@/utils/AssetApi";
import { error } from "@tauri-apps/plugin-log";

export default function ExtractToolBar({ title, id }: { title: string, id: number | null }) {

    const [status, setStatus] = useState(0)
    const val = useExtractProgressTable((state) => state.val);
    const setVal = useExtractProgressTable((state) => state.setVal)
    const setIsFirstScan = useExtractProgressTable((state) => state.setIsFirstScan);
    const setTotal = useExtractProgressTable((state) => state.setTotal);
    const setScanned = useExtractProgressTable((state) => state.setScanned);
    const setTotalResult = useExtractProgressTable((state) => state.setTotalResult);
    const [isScanStart, setIsScanStart] = useState(false);
    const [isScanEnd, setIsScanEnd] = useState<boolean>(false);


    const handleScanBtn = async () => {
        if (!id) return;
        setStatus(1);
        setIsScanStart(true);
        try {
            // project_info.status：0=已导入 1=已补全 2=已扫描；>=2 说明扫描已完成，直接进入提取
            const info = await manager.selectProjectInfo(id);
            if ((info?.status ?? 0) < 2) {
                setIsFirstScan(true);
                await assetApi.scan(title)
                setIsScanEnd(true)
                await manager.updateProjectStatus(id, 2)
                await assetApi.extract()
                await manager.updateProjectStatus(id, 3)
            } else {
                const status = await gm.selectScanStatus();
                if (status && status.total > 0) {
                    const val = Math.ceil(status.scanned * 100.0 / status.total);
                    setVal(val);
                    setTotal(status.total ?? 0);
                    setScanned(status.scanned ?? 0);
                    setTotalResult(status.line ?? 0);
                }
                await assetApi.extract();
                await manager.updateProjectStatus(id, 3)
            }
        } catch (e) {
            // SSE 连接失败（后端未启动/扫描异常）时不能让按钮卡在"暂停"状态，
            // 复位状态并记录日志，避免 Uncaught (in promise)
            error(`扫描/提取任务失败: ${e}`)
            setStatus(0)
            setIsScanEnd(false)
        } finally {
            setIsScanStart(false);
        }
    }
    const handleStopBtn = async () => {
        setStatus(3);

        try {
            if (isScanEnd) {
                await assetApi.pauseExtract();
            } else {
                await assetApi.pauseScan();
            }
        } catch (e) {
            error(`暂停失败: ${e}`)
        }
    }
    const handleContinueBtn = async () => {
        setStatus(1);

        try {
            if (isScanEnd) {
                await assetApi.resumeExtract();
            } else {
                await assetApi.resumeScan();
            }
        } catch (e) {
            error(`恢复失败: ${e}`)
        }
    }

    return (
        <div className="w-full h-10 flex gap-4 items-center justify-between">
            <div className="w-full flex h-full  bg-white px-4 py-2 rounded-md items-center justify-between">
                <div className="flex gap-2 items-center truncate pr-2">
                    <span className="text-xs font-semibold select-none truncate" >{title}</span>
                    <ScanStatus status={val == 100 ? 2 : status} />
                </div>
                <div className="flex gap-2">
                    {
                        isScanStart ? (
                            status != 3 ? (
                                <button onClick={handleStopBtn} className="w-14 h-6 gap-1
                                    flex items-center justify-center cursor-pointer 
                                    text-semibold rounded-sm text-black text-xs
                                    border border-gray-400 hover:bg-gray-200 ">
                                    <PiPause />
                                    <span className="select-none">暂停</span>
                                </button>
                            ) : (
                                <button onClick={handleContinueBtn} className="w-14 h-6 gap-1 
                                    flex items-center justify-center cursor-pointer 
                                    text-semibold rounded-sm text-white text-xs 
                                    bg-[#0067c0] hover:bg-[#0067c0]/70">
                                    <FiPlay />
                                    <span className="select-none">继续</span>
                                </button>
                            )
                        ) : (
                            <button onClick={handleScanBtn} className="w-14 h-6 gap-1 
                                flex items-center justify-center cursor-pointer 
                                text-semibold rounded-sm text-white text-xs 
                                bg-[#0067c0] hover:bg-[#0067c0]/70">
                                <FiPlay />
                                <span className="select-none">扫描</span>
                            </button>
                        )
                    }
                </div>
            </div>
        </div>
    )
}