import { FiPlay } from "react-icons/fi";
import { PiPause } from "react-icons/pi";
import ScanStatus from "./ScanStatus";
import { useState } from "react";
import { useExtractProgressTable } from "@/utils/useExtractProgress";
import { gm } from "@/utils/GameDbManager";
import runSSE from "@/utils/SSEHandler";

export default function ExtractToolBar({ title }: { title: string }) {

    const [status, setStatus] = useState(0)
    const val = useExtractProgressTable((state) => state.val);
    const setVal = useExtractProgressTable((state) => state.setVal)
    const setIsFirstScan = useExtractProgressTable((state) => state.setIsFirstScan);
    const setTotal = useExtractProgressTable((state) => state.setTotal);
    const setScanned = useExtractProgressTable((state) => state.setScanned);
    const setTotalResult = useExtractProgressTable((state) => state.setTotalResult);
    const [isScanStart, setIsScanStart] = useState(false);
    const handleScanBtn = async () => {
        setStatus(1);
        setIsScanStart(true);
        const status = await gm.selectScanStatus();
        if (status?.total == 0) {
            setIsFirstScan(true);
            runSSE(`http://localhost:5089/api/command/scan/${title}`).then(()=>
                runSSE(`http://localhost:5089/api/command/extract`)
            )
        } else {
            if (!status) return;
            const val = Math.ceil(status.scanned * 100.0 / status.total); 
            setVal(val);
            setTotal(status.total ?? 0);
            setScanned(status.scanned ?? 0);
            setTotalResult(status.line ?? 0);
            runSSE(`http://localhost:5089/api/command/extract`);
        }
    }
    const handleStopBtn = () => {
        setStatus(3);
        setIsScanStart(false);
    }
    const handleSecondScanBtn = () => {
        
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
                            val != 100 ? (
                                <button onClick={handleStopBtn} className="w-14 h-6 gap-1
                                    flex items-center justify-center cursor-pointer 
                                    text-semibold rounded-sm text-black text-xs
                                    border border-gray-400 hover:bg-gray-200 ">
                                    <PiPause />
                                    <span className="select-none">暂停</span>
                                </button>
                            ) : (
                                <button onClick={handleSecondScanBtn} className="w-14 h-6 gap-1 
                                    flex items-center justify-center cursor-pointer 
                                    text-semibold rounded-sm text-white text-xs 
                                    bg-[#0067c0] hover:bg-[#0067c0]/70">
                                    <FiPlay />
                                    <span className="select-none">扫描</span>
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