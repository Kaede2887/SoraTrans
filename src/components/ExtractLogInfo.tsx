import { memo } from "react";

export type LogType = "progress" | "discover" | "analyze" | "start" | "scan"

const ExtractLogInfo = memo(function ExtractLogInfo({ type, time, log }: { type: LogType, time: string, log: string }) {
    switch (type) {
        case "start":
            return <StartLog time={time} log={log} />
        case "scan":
            return <ScanLog time={time} log={log} />
        case "progress":
            return <ProgressLog time={time} log={log} />
        case "discover":
            return <DiscoverLog time={time} log={log} />
        case "analyze":
            return <AnalyzeLog time={time} log={log} />
    }
})

export default ExtractLogInfo

function StartLog({ time, log }: { time: string, log: string }) {
    return (
        <div className="overflow-hidden truncate flex gap-2 items-center">
            <span className="text-xs select-none text-gray-400/70">{time}</span>
            <span className="text-[10px] select-none px-[6px] h-4 flex justify-center items-center bg-blue-100 text-blue-400 font-semibold rounded-xs">开始</span>
            <span className="text-xs truncate select-none">{log}</span>
        </div>
    )
}


function ScanLog({ time, log }: { time: string, log: string }) {
    return (
        <div className="overflow-hidden truncate flex gap-2 items-center">
            <span className="text-xs select-none text-gray-400/70">{time}</span>
            <span className="text-[10px] select-none px-[6px] h-4 flex justify-center items-center bg-blue-100 text-blue-400 font-semibold rounded-xs">扫描</span>
            <span className="text-xs truncate select-none">{log}</span>
        </div>
    )
}

function ProgressLog({ time, log }: { time: string, log: string }) {
    return (
        <div className="overflow-hidden truncate flex gap-2">
            <span className="text-xs select-none text-gray-400/70">{time}</span>
            <span className="text-[10px] px-[6px] h-4 select-none flex justify-center items-center bg-blue-100 text-blue-400 font-semibold rounded-xs">进度</span>
            <span className="text-xs truncate select-none">{log}</span>
        </div>
    )
}

function DiscoverLog({ time, log }: { time: string, log: string }) {
    return (
        <div className="overflow-hidden truncate flex gap-2">
            <span className="text-xs select-none text-gray-400/70">{time}</span>
            <span className="text-[10px] px-[6px] h-4  select-none flex justify-center items-center bg-green-100 text-green-400 font-semibold rounded-xs">发现</span>
            <span className="text-xs truncate select-none">{log}</span>
        </div>
    )
}

function AnalyzeLog({ time, log }: { time: string, log: string }) {
    return (
        <div className="overflow-hidden truncate flex gap-2">
            <span className="text-xs select-none text-gray-400/70">{time}</span>
            <span className="text-[10px] px-[6px] h-4  select-none flex justify-center items-center bg-orange-100 text-orange-400 font-semibold rounded-xs">分析</span>
            <span className="text-xs truncate select-none">{log}</span>
        </div>
    )
}