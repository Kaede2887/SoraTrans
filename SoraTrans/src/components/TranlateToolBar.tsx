import { useAssetObjectStore } from "@/model/AssetObjectInfo"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"
import { DownloadIcon, ImageIcon, UploadIcon } from "lucide-react"
import { ReactNode, useEffect, useState } from "react"
import { FiFileText, FiTable } from "react-icons/fi"
import { open, save } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import { assetApi } from "@/utils/AssetApi";
import { PatchDialog, PatchPhase } from "./PatchDialog";

// 与 AssetWorker 端 AssetScanner.OutputFolderName 保持一致
const OUTPUT_FOLDER_NAME = "SoraTransOutput";

export default function TranslateToolBar() {

    const selectAssetObj = useAssetObjectStore((state) => state.selectAssetObj)

    const handleViewData = () => {
        if (!selectAssetObj) return;
        const webviewWindow = new WebviewWindow('viewdata', {
            url: `viewdata.html?id=${selectAssetObj.id}&title=${selectAssetObj.name}`,
            title: '查看数据',
            width: 300,
            height: 520,
            decorations: false,
            minWidth: 300,
            resizable: true,
            transparent: true,
        });
        webviewWindow.once('tauri://created', () => {
            console.log("新窗口建立成功");
        });
        webviewWindow.once('tauri://error', (e) => {
            console.error("新窗口建立失败", e);
        });
    }

    const handleViewText = () => {
        if (!selectAssetObj) return;
        const webviewWindow = new WebviewWindow('viewtext', {
            url: `viewtext.html?objId=${selectAssetObj.id}&title=${selectAssetObj.name}`,
            title: '查看数据',
            width: 800,
            height: 520,
            decorations: false,
            minWidth: 500,
            minHeight: 170,
            resizable: true,
            transparent: true,
        })
        webviewWindow.once('tauri://created', () => {
            console.log("新窗口建立成功");
        });
        webviewWindow.once('tauri://error', (e) => {
            console.error("新窗口建立失败", e);
        });
    }

    const handlePreviewTexture = () => {
        if (!selectAssetObj) return;
        const webviewWindow = new WebviewWindow('texturepreview', {
            url: `texturepreview.html?id=${selectAssetObj.id}&title=${selectAssetObj.name}`,
            title: '预览图片',
            width: 520,
            height: 560,
            decorations: false,
            minWidth: 240,
            minHeight: 200,
            resizable: true,
            transparent: true,
        })
        webviewWindow.once('tauri://created', () => {
            console.log("新窗口建立成功");
        });
        webviewWindow.once('tauri://error', (e) => {
            console.error("新窗口建立失败", e);
        });
    }

    const [patchOpen, setPatchOpen] = useState(false)
    const [patchPhase, setPatchPhase] = useState<PatchPhase>("making")
    const [patchError, setPatchError] = useState("")
    const [patchDir, setPatchDir] = useState("")

    // 纹理导入/导出的临时反馈消息：操作完成后显示，3 秒后自动清除
    const [textureBusy, setTextureBusy] = useState(false)
    const [textureMsg, setTextureMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
    useEffect(() => {
        if (!textureMsg) return;
        const t = setTimeout(() => setTextureMsg(null), 3000);
        return () => clearTimeout(t);
    }, [textureMsg])

    const handleExportTexture = async () => {
        if (!selectAssetObj) return;
        const savePath = await save({
            title: "导出纹理为 PNG",
            defaultPath: `${selectAssetObj.name}.png`,
            filters: [{ name: "PNG", extensions: ["png"] }],
        });
        if (!savePath) return;
        setTextureBusy(true);
        setTextureMsg(null);
        try {
            const { width, height } = await assetApi.exportTexture(selectAssetObj.id, savePath);
            setTextureMsg({ kind: "ok", text: `已导出 ${width}×${height}` });
        } catch (e) {
            setTextureMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
        } finally {
            setTextureBusy(false);
        }
    }

    const handleImportTexture = async () => {
        if (!selectAssetObj) return;
        const picked = await open({
            title: "选择要导入的 PNG 图片",
            multiple: false,
            filters: [{ name: "PNG", extensions: ["png"] }],
        });
        if (!picked || Array.isArray(picked)) return;
        const pngPath = picked as string;
        setTextureBusy(true);
        setTextureMsg(null);
        try {
            const result = await assetApi.importTexture(selectAssetObj.id, pngPath);
            useAssetObjectStore.getState().setModInfo(selectAssetObj.id);
        } catch (e) {
            setTextureMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
        } finally {
            setTextureBusy(false);
        }
    }

    const handleMakePatch = async () => {
        const dir = await open({
            title: "选择导出文件夹",
            multiple: false,
            directory: true,
        })
        if (!dir) return;

        // 补丁实际写入所选目录下的固定子目录，对话框展示/打开该目录
        const outDir = await join(dir, OUTPUT_FOLDER_NAME);
        setPatchDir(outDir)
        setPatchError("")
        setPatchPhase("making")
        setPatchOpen(true)
        try {
            await assetApi.makePatch(dir);
            setPatchPhase("done")
        } catch (e) {
            setPatchError(String(e))
            setPatchPhase("error")
        }
    }

    return (
        <div className="px-2 flex flex-col gap-1 py-1 lg:py-4">
            <div className="w-full flex flex-col gap-1">
                <ToolTitle title="属性" />
                <div className="leading-none flex flex-col flex-1 gap-1 overflow-hidden">
                    <p className="text-[10px] text-neutral-400 leading-none select-none">名称</p>
                    <p className="border px-2 h-6 flex items-center font-san rounded-sm text-[10px] truncate">{selectAssetObj?.name}</p>
                </div>
                <div className="grid gap-1 grid-cols-2">
                    <div className="flex flex-col gap-1 overflow-hidden">
                        <p className="text-[10px] text-neutral-400 leading-none select-none truncate">Path ID</p>
                        <p className="border px-2 h-6 flex items-center rounded-sm font-mono leading-none text-[10px] truncate">{selectAssetObj?.path_id}</p>
                    </div>
                    <div className="flex flex-col gap-1 overflow-hidden">
                        <p className="text-[10px] text-neutral-400 leading-none select-none truncate">行数</p>
                        <p className="border px-2 h-6 flex items-center rounded-sm text-[10px] leading-none font-mono truncate">{selectAssetObj?.line_count}</p>
                    </div>
                </div>
                <div className="leading-none flex flex-col flex-1 gap-1 overflow-hidden">
                    <p className="text-[10px] text-neutral-400 leading-none select-none">类型</p>
                    <p className="border px-2 h-6 flex items-center justify-between font-san rounded-sm text-[10px] truncate">{selectAssetObj?.type}</p>
                </div>
            </div>
            <div className="w-full flex flex-col gap-1">
                <ToolTitle title="查看" />
                <div className="grid gap-1 lg:grid-cols-2 overflow-hidden">
                    <ToolBtn onClick={handleViewData} icon={<FiTable size={10} className="text-neutral-500" />} text="查看数据" />
                    {selectAssetObj?.type !== "Texture2D" && (
                        <ToolBtn onClick={handleViewText} icon={<FiFileText size={10} className="text-neutral-500" />} text="查看文本" />
                    )}
                    {selectAssetObj?.type === "Texture2D" && (
                        <ToolBtn onClick={handlePreviewTexture} icon={<ImageIcon size={10} className="text-neutral-500" />} text="预览图片" />
                    )}
                </div>
            </div>
            <div className="w-full flex flex-col gap-1">
                <ToolTitle title="导入 / 导出" />
                <div className="grid gap-1 lg:grid-cols-2 overflow-hidden">
                    {selectAssetObj?.type === "Texture2D" && (
                        <>
                            <ToolBtn
                                onClick={handleExportTexture}
                                icon={<DownloadIcon size={10} className="text-neutral-500" />}
                                text="导出图片"
                                disabled={textureBusy}
                            />
                            <ToolBtn
                                onClick={handleImportTexture}
                                icon={<UploadIcon size={10} className="text-neutral-500" />}
                                text="导入图片"
                                disabled={textureBusy}
                            />
                        </>
                    )}
                    {/* <ToolBtn icon={<UploadIcon size={10} className="text-neutral-500" />} text="导入 Raw" />
                    <ToolBtn icon={<DownloadIcon size={10} className="text-neutral-500" />} text="导出 Raw" />
                    <ToolBtn icon={<UploadIcon size={10} className="text-neutral-500" />} text="导入 Dump" />
                    <ToolBtn icon={<DownloadIcon size={10} className="text-neutral-500" />} text="导出 Dump" /> */}
                    <ToolBtn onClick={handleMakePatch} icon={<DownloadIcon size={10} className="text-neutral-500" />} text="制作补丁" />
                </div>
                {textureMsg && (
                    <p className={`text-[10px] leading-tight px-1 py-0.5 rounded-sm break-all ${textureMsg.kind === "ok" ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                        {textureMsg.text}
                    </p>
                )}
            </div>
            <PatchDialog open={patchOpen} phase={patchPhase} errorMsg={patchError} dir={patchDir} onOpenChange={setPatchOpen} />
        </div>
    )
}

function ToolTitle({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-400 font-sans leading-none select-none">{title}</span>
            <div className="flex-1 h-px bg-neutral-200"></div>
        </div>
    )
}

export function ToolBtn({ icon, text, onClick, disabled }: { icon: ReactNode, text: string, onClick?: () => void, disabled?: boolean }) {

    return (
        <div onClick={disabled ? undefined : onClick} className={`flex items-center px-1 h-6 justify-center gap-1 border rounded-sm ${disabled ? "opacity-50 cursor-not-allowed border-neutral-200" : "cursor-pointer hover:bg-muted/50 hover:border-gray-400"}`}>
            {icon}
            <span className="text-[10px] truncate leading-none select-none">{text}</span>
        </div>
    )
}