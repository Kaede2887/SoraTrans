import { LogType } from "@/components/ExtractLogInfo";
import { create } from "zustand";

// 归一化后的日志条目（小写字段，与 ExtractLog 消费端一致）。
// C# 原始字段为 LogType/Time/Log，在 EditorListener 中转换。
export default interface LogInfo{
    id?: number,
    type: LogType,
    time: string,
    log: string
}

// 实时日志面板最多保留条数，避免数组无限增长导致每帧 O(n) 拷贝和渲染
const MAX_LOGS = 200;

let logIdCounter = 0;

interface LogState {
  logList: LogInfo[];
  addLog: (info: LogInfo) => void;
  // 批量追加：一次 set 写入多条，供 rAF 节流批量 flush 使用
  addLogs: (infos: LogInfo[]) => void;
}

export const useLogStore = create<LogState>((set) => ({
    logList: [],
    addLog: (info) => set((state)=>({
        logList: [
            { ...info, id: logIdCounter++ },
            ...state.logList
        ].slice(0, MAX_LOGS)
    })),
    addLogs: (infos) => set((state) => {
        if (infos.length === 0) return state;
        const newLogs = infos.map((info) => ({ ...info, id: logIdCounter++ }));
        return {
            logList: [...newLogs, ...state.logList].slice(0, MAX_LOGS)
        };
    })
}));
