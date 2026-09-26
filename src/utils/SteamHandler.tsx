import { useExtractProgressTable } from "./useExtractProgress";
import LogInfo, { useLogStore } from "@/model/LogInfo";
import ProgressInfo from "@/model/ProgressInfo";
import FileLogInfo, { useFileLogStore } from "@/model/FileLogInfo";
import { ViewNode, useViewTreeStore } from "@/model/ViewNode";

interface ExtLogMessage {
    type: string;
    time: string;
    log: unknown;
}

interface ExtFileLogMessage {
    type: string;
    file: string;
}

export default class SteamHandler {

    lastUpdate = 0;

    // rAF 节流：密集到达的 discover 日志先入缓冲，下一帧统一 flush 一次。
    private pendingLogs: LogInfo[] = [];
    private RafId: number | null = null;
    private pendingFileLogs: FileLogInfo[] = [];
    private pendingUpdateFileLogs: FileLogInfo[] = [];
    private RafFileId: number | null = null;
    private RafUpdateFileId: number | null = null;
    private pendingTitle: string | null = null;
    private RafTitleId: number | null = null;
    private pendingViewNodes: ViewNode[] = [];
    private RafViewId: number | null = null;

    handleExtFileLog(msg: ExtFileLogMessage) {
        const fileLog: FileLogInfo = {
            type: msg.type as FileLogInfo["type"],
            file: msg.file
        };
        switch (msg.type) {
            case "wait":
                this.enqueueFile(fileLog)
                break;
            case "handle":
                this.enqueueTitle(fileLog.file)
                this.enqueueUpdateFile(fileLog)
                break;
            case "completed":
            case "failed":
                this.enqueueUpdateFile(fileLog)
                break;
            default:
                break;
        }
    }

    handleExtLog(extLog: ExtLogMessage) {
        // C# 字段名是 LogType，不是 Type
        switch (extLog.type) {
            case "start":
                this.enqueue({
                    type: "start",
                    time: extLog.time,
                    log: String(extLog.log)
                })
                break;
            case "scan":
                this.enqueue({
                    type: "scan",
                    time: extLog.time,
                    log: String(extLog.log)
                })
                break;
            case "progress": {
                const progressInfo = extLog.log as ProgressInfo
                this.updateProgress(progressInfo)
                break;
            }
            case "discover":
                this.enqueue({
                    type: "discover",
                    time: extLog.time,
                    log: String(extLog.log)
                })
                break;
            case "analyze":
                this.enqueue({
                    type: "analyze",
                    time: extLog.time,
                    log: String(extLog.log)
                })
                break;
            default:
                break;
        }
    }

    updateProgress(progress: ProgressInfo) {
        const now = performance.now();
        const isFinal = progress.val >= 100 || progress.scanned >= progress.total;

        if (!isFinal && now - this.lastUpdate < 50) {
            return;
        }

        this.lastUpdate = now;

        useExtractProgressTable.getState().updateProgress({
            val: Math.ceil(progress.val),
            scanned: progress.scanned,
            total: progress.total,
            elapsed: progress.elapsed,
            remaining: progress.remaining,
            totalResult: progress.line
        })
    }

    private enqueue(info: LogInfo) {
        this.pendingLogs.push(info);
        if (this.RafId !== null) return;
        this.RafId = requestAnimationFrame(() => {
            this.RafId = null;
            const batch = this.pendingLogs;
            this.pendingLogs = [];
            if (batch.length) {
                useLogStore.getState().addLogs(batch);
            }
        });
    }

    private enqueueUpdateFile(fileInfo: FileLogInfo) {
        this.pendingUpdateFileLogs.push(fileInfo);
        if (this.RafUpdateFileId !== null) return;
        this.RafUpdateFileId = requestAnimationFrame(() => {
            this.RafUpdateFileId = null;
            const batch = this.pendingUpdateFileLogs;
            this.pendingUpdateFileLogs = [];
            if (batch.length) {
                useFileLogStore.getState().updateLogs(batch)
            }
        });
    }

    private enqueueFile(fileInfo: FileLogInfo) {
        this.pendingFileLogs.push(fileInfo);
        if (this.RafFileId !== null) return;
        this.RafFileId = requestAnimationFrame(() => {
            this.RafFileId = null;
            const batch = this.pendingFileLogs;
            this.pendingFileLogs = [];
            if (batch.length) {
                useFileLogStore.getState().addLogs(batch)
            }
        });
    }

    private enqueueTitle(title: string) {
        this.pendingTitle = title;
        if (this.RafTitleId !== null) return;
        this.RafTitleId = requestAnimationFrame(() => {
            this.RafTitleId = null;
            if (this.pendingTitle !== null) {
                useExtractProgressTable.getState().setTitle(this.pendingTitle)
                this.pendingTitle = null;
            }
        });
    }

    public handleViewNode(node: ViewNode) {
        this.enqueueViewNode(node)
    }

    // 后端业务错误（event:error）：直接写入 store，在树内展示
    public handleViewError(message: string) {
        useViewTreeStore.getState().setError(message)
    }

    private enqueueViewNode(node: ViewNode) {
        this.pendingViewNodes.push(node);
        if (this.RafViewId !== null) return;
        this.RafViewId = requestAnimationFrame(() => {
            this.RafViewId = null;
            const batch = this.pendingViewNodes;
            this.pendingViewNodes = [];
            if (batch.length) {
                useViewTreeStore.getState().addNodes(batch)
            }
        });
    }

}



