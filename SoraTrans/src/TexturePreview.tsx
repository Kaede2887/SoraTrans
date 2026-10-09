import { useCallback, useEffect, useRef, useState } from 'react';
import './Launcher.css'
import TitleBar from "./components/TitleBar";
import { AlertTriangle, Loader2 } from "lucide-react";
import { assetApi } from '@/utils/AssetApi';

interface LoadedTexture {
    blobUrl: string;
    width: number;
    height: number;
}

// 透明背景棋盘格
const checkerStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    backgroundImage:
        "linear-gradient(45deg,#e2e2e2 25%,transparent 25%,transparent 75%,#e2e2e2 75%),linear-gradient(45deg,#e2e2e2 25%,transparent 25%,transparent 75%,#e2e2e2 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0,8px 8px",
}

function TexturePreview() {

    const [title, setTitle] = useState<string>("")
    const [id, setId] = useState<number>();
    const [texture, setTexture] = useState<LoadedTexture | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    // true = 适配窗口；false = 原始尺寸（可滚动查看）
    const [fit, setFit] = useState(true)
    // 自增 key 用于手动重试时重新创建 <img>
    const [retryKey, setRetryKey] = useState(0)
    const blobUrlRef = useRef<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setId(Number(params.get("id")));
        setTitle(String(params.get("title")));
    }, [])

    const load = useCallback(async (objId: number) => {
        setLoading(true)
        setError("")
        setTexture(prev => {
            if (prev) URL.revokeObjectURL(prev.blobUrl)
            blobUrlRef.current = null
            return null
        })
        try {
            const res = await assetApi.fetchTexturePreview(objId)
            blobUrlRef.current = res.blobUrl
            setTexture({ blobUrl: res.blobUrl, width: res.width, height: res.height })
        } catch (e) {
            setError(String(e))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (id == null) return
        load(id)
        return () => {
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        }
    }, [id, retryKey, load])

    return (
        <div className="flex flex-col h-screen w-screen" onContextMenu={(e) => e.preventDefault()}>
            <TitleBar className='pl-2 pr-4 h-[30px]' title={title} />
            <main className="relative flex flex-1 min-h-0 w-screen overflow-hidden bg-[#f0f1f3] p-2">
                {loading && (
                    <div className="flex h-full w-full min-w-0 items-center justify-center gap-2 text-[#9aa0a8]">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs">图片解码中...</span>
                    </div>
                )}
                {!loading && error && (
                    <div className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-2 px-6 text-center">
                        <AlertTriangle size={20} className="text-[#d93025]" />
                        <p className="text-xs leading-5 text-[#d93025] [overflow-wrap:anywhere]">{error}</p>
                        <button
                            type="button"
                            onClick={() => setRetryKey(k => k + 1)}
                            className="mt-1 rounded-sm border px-2 py-1 text-[10px] text-neutral-600 hover:bg-muted/50"
                        >
                            重试
                        </button>
                    </div>
                )}
                {!loading && !error && texture && (
                    <div
                        className="h-full w-full min-h-0 overflow-auto rounded-sm border border-neutral-200"
                        style={checkerStyle}
                        onDoubleClick={() => setFit(f => !f)}
                        title="双击切换 适配窗口 / 原始尺寸"
                    >
                        <div className="flex min-h-full min-w-full items-center justify-center p-2">
                            <img
                                key={retryKey}
                                src={texture.blobUrl}
                                alt={title}
                                draggable={false}
                                className={fit ? "max-h-full max-w-full object-contain select-none" : "select-none"}
                                style={{ imageRendering: "auto" }}
                            />
                        </div>
                    </div>
                )}
                {!loading && !error && texture && (
                    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/55 px-2 py-[3px] text-[10px] leading-none text-white whitespace-nowrap">
                        {texture.width} × {texture.height}　·　双击{fit ? "查看原始尺寸" : "适配窗口"}
                    </div>
                )}
            </main>
        </div>
    );
}

export default TexturePreview;
