import { useAssetObjectStore } from "@/model/AssetObjectInfo"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"
import { DownloadIcon } from "lucide-react"
import { ReactNode, useState } from "react"
import { FiFileText, FiTable } from "react-icons/fi"
import { open } from '@tauri-apps/plugin-dialog';
import { fetch } from '@tauri-apps/plugin-http';
import { PatchDialog, PatchPhase } from "./PatchDialog";

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

    const [patchOpen, setPatchOpen] = useState(false)
    const [patchPhase, setPatchPhase] = useState<PatchPhase>("making")
    const [patchError, setPatchError] = useState("")
    const [patchDir, setPatchDir] = useState("")

    const handleMakePatch = async () => {
        const dir = await open({
            title: "选择导出文件夹",
            multiple: false,
            directory: true,
        })
        if (!dir) return;

        setPatchDir(dir)
        setPatchError("")
        setPatchPhase("making")
        setPatchOpen(true)
        try {
            const formData = new URLSearchParams();
            formData.append('dir', dir);
            const res = await fetch("http://localhost:5089/api/command/make_patch",{
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData
            })
            if (!res.ok) throw new Error(`服务返回状态 ${res.status}`)
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
                    <ToolBtn onClick={handleViewText} icon={<FiFileText size={10} className="text-neutral-500" />} text="查看文本" />
                </div>
            </div>
            <div className="w-full flex flex-col gap-1">
                <ToolTitle title="导入 / 导出" />
                <div className="grid gap-1 lg:grid-cols-2 overflow-hidden">
                    {/* <ToolBtn icon={<UploadIcon size={10} className="text-neutral-500" />} text="导入 Raw" />
                    <ToolBtn icon={<DownloadIcon size={10} className="text-neutral-500" />} text="导出 Raw" />
                    <ToolBtn icon={<UploadIcon size={10} className="text-neutral-500" />} text="导入 Dump" />
                    <ToolBtn icon={<DownloadIcon size={10} className="text-neutral-500" />} text="导出 Dump" /> */}
                    <ToolBtn onClick={handleMakePatch} icon={<DownloadIcon size={10} className="text-neutral-500" />} text="制作补丁" />
                </div>
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

export function ToolBtn({ icon, text, onClick }: { icon: ReactNode, text: string, onClick?: () => void }) {

    return (
        <div onClick={onClick} className="flex cursor-pointer hover:bg-muted/50 hover:border-gray-400 items-center px-1 h-6 justify-center gap-1 border rounded-sm">
            {icon}
            <span className="text-[10px] truncate leading-none select-none">{text}</span>
        </div>
    )
}