import { ViewNode } from "@/model/ViewNode";
import SteamHandler from "./SteamHandler";
import { useExtractProgressTable } from "./useExtractProgress";

interface ExtLogMessage {
    type: string;
    time: string;
    log: unknown;
}
interface ExtFileLogMessage {
    type: string;
    file: string;
}

export default function runSSE(url: string): Promise<void> {
    const steamHandler = new SteamHandler()

    return new Promise((resolve, reject) => {
        const source = new EventSource(url);

        source.addEventListener("view_node", (event) => {
            const data = JSON.parse(event.data) as ViewNode;
            steamHandler.handleViewNode(data);
        })

        source.addEventListener("extract_log", (event) => {
            const data = JSON.parse(event.data) as ExtLogMessage;
            steamHandler.handleExtLog(data);
        })

        source.addEventListener("extract_filelog", (event) => {
            const data = JSON.parse(event.data) as ExtFileLogMessage;
            steamHandler.handleExtFileLog(data);
        })

        source.addEventListener("scan", (event) => {
            const data = event.data as string;
            useExtractProgressTable.getState().setTotal(Number(data));
            useExtractProgressTable.getState().setIsFirstScan(false);
        })

        source.addEventListener("done", () => {
            source.close();
            resolve();
        });

        source.addEventListener("error", (event) => {
            source.close();
            reject(event);
        });

        source.addEventListener("view_error", (event) => {
            // 后端下发的命名 error 事件是带 data 的 MessageEvent（{"message":"..."}）；
            // 连接失败/断开是无 data 的普通 Event，两者要区分处理
            const raw = (event as MessageEvent).data;
            if (typeof raw === "string" && raw.length > 0) {
                try {
                    const payload = JSON.parse(raw) as { message?: unknown };
                    if (payload && typeof payload.message === "string") {
                        source.close();
                        steamHandler.handleViewError(payload.message);
                        resolve();
                        return;
                    }
                } catch {
                    // 非业务错误 JSON，按连接错误处理
                }
            }
            source.close();
            reject(event);
        });
    });
}