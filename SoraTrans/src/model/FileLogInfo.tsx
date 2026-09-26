import { FileStatus } from "@/components/ExtractRecentFileItem";
import { create } from "zustand";

// 归一化后的文件日志条目（小写字段，与 ExtractRecentFile 消费端一致）。
// C# 原始字段为 Type/File，在 EditorListener 中转换。
export default interface FileLogInfo {
    type: FileStatus,
    file: string
}

// 最近文件面板最多保留条数，避免数组无限增长导致每帧 O(n) map 和渲染
const MAX_FILES = 300;

interface FileLogState {
    fileLogList: FileLogInfo[];
    addLog: (info: FileLogInfo) => void;
    addLogs: (infos: FileLogInfo[]) => void;
    updateLog: (newInfo: FileLogInfo) => void;
    updateLogs: (infos: FileLogInfo[]) => void;
}

export const useFileLogStore = create<FileLogState>((set) => ({
    fileLogList: [],
    addLog: (info) => set((state) => ({
        fileLogList: [
            ...state.fileLogList,
            info
        ].slice(-MAX_FILES)
    })),
    addLogs: (infos) => set((state) => {
        if (infos.length === 0) return state;
        return {
            fileLogList: [...state.fileLogList, ...infos].slice(-MAX_FILES)
        };
    }),
    updateLog: (newInfo) => set((state) => ({
        fileLogList: state.fileLogList.map((info) =>
            info.file === newInfo.file
                ? { ...info, type: newInfo.type }
                : info
        )
    })),
    updateLogs: (infos) => set((state) => {
        if (infos.length === 0) return state;
        // 用 Map 索引批量数据，避免 O(n*m) 嵌套循环
        const updateMap = new Map(infos.map((i) => [i.file, i.type]));
        return {
            fileLogList: state.fileLogList.map((info) =>
                updateMap.has(info.file)
                    ? { ...info, type: updateMap.get(info.file)! }
                    : info
            )
        };
    })
}));
