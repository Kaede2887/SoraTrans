import { CircleProgress } from "./ui/progress";
import ExtractInfoItem from "./ExtractInfoItem";
import { useExtractProgressTable } from "@/utils/useExtractProgress";

export default function ExtractProgress() {

    const val = useExtractProgressTable((state)=> state.val);
    const scanned = useExtractProgressTable((state)=> state.scanned);
    const total = useExtractProgressTable((state)=> state.total);
    const elapsed = useExtractProgressTable((state)=> state.elapsed);
    const totalResult = useExtractProgressTable((state)=> state.totalResult);
    const title = useExtractProgressTable((state)=> state.title);

    const remaining = total > 0 && scanned > 0
        ? Math.ceil((total - scanned) / (scanned / elapsed))
        : 0;

    return (
        <div className="bg-white w-3/5 h-full overflow-hidden flex flex-col gap-2 sm:gap-8 px-4 rounded-sm items-center justify-center">
            <CircleProgress value={val}/>
            <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400 select-none sm:text-sm">剩余
                    <span className="text-black font-medium select-none pl-1 sm:text-sm">{formatTime(remaining)}</span>
                </span>
                <span className="text-xs text-gray-400 max-w-36 select-none truncate sm:text-sm sm:max-w-48">当前
                    <span className="text-blue-400 select-text pl-1  sm:text-sm">{title}</span>
                </span>
            </div>
            <div className="w-full grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ExtractInfoItem title="总文件" data={total}/>
                <ExtractInfoItem title="已扫描" data={scanned}/>
                <ExtractInfoItem title="待扫描" data={total - scanned}/>
                <ExtractInfoItem title="发现文本" data={totalResult}/>
            </div>
        </div>
    )
}

function formatTime(seconds: number) {

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return [h, m, s]
        .map(v => String(v).padStart(2, "0"))
        .join(":");
}