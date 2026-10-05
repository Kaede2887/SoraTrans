import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { invoke } from "@tauri-apps/api/core"
import { Check, CheckCircle2, Copy, FolderOpen, Loader2, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export type PatchPhase = "making" | "done" | "error"

interface PatchDialogProps {
    open: boolean,
    phase: PatchPhase,
    errorMsg: string,
    dir: string,
    onOpenChange: (open: boolean) => void,
}

export function PatchDialog({ open, phase, errorMsg, dir, onOpenChange }: PatchDialogProps) {

    const [copied, setCopied] = useState(false)
    const copyTimer = useRef<number | null>(null)

    useEffect(() => {
        return () => {
            if (copyTimer.current) clearTimeout(copyTimer.current)
        }
    }, [])

    const handleOpenFolder = () => {
        if (!dir) return;
        invoke("open_dir", { path: dir })
    }

    const handleCopyPath = async () => {
        if (!dir) return;
        try {
            await navigator.clipboard.writeText(dir)
            setCopied(true)
            if (copyTimer.current) clearTimeout(copyTimer.current)
            copyTimer.current = window.setTimeout(() => setCopied(false), 1500)
        } catch {
            // 剪贴板不可用时静默忽略
        }
    }

    // 制作中禁止关闭，避免用户误触后以为任务已结束
    const guardMaking = (e: Event) => {
        if (phase == "making") e.preventDefault()
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (phase == "making") return;
                onOpenChange(o)
            }}
        >
            <DialogContent
                showCloseButton={phase != "making"}
                onEscapeKeyDown={guardMaking}
                onInteractOutside={guardMaking}
                className={`gap-0 rounded-2xl ${phase == "making" ? "w-72 p-5" : "w-[340px] p-5"}`}
            >
                {
                    phase == "making" && (
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                                <Loader2 className="size-5 animate-spin text-blue-600" />
                            </div>
                            <div className="flex flex-col gap-1 pt-0.5">
                                <div className="text-sm leading-none font-semibold">补丁制作中</div>
                                <div className="text-[8px] text-muted-foreground">正在写入补丁文件，请勿关闭窗口...</div>
                            </div>
                        </div>
                    )
                }
                {
                    phase == "done" && (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-50">
                                    <CheckCircle2 className="size-6 text-green-600" />
                                </div>
                                <div className="flex flex-col justify-center gap-1 pt-1 min-w-0">
                                    <div className="text-sm leading-none font-semibold">补丁制作完成</div>
                                    <div className="text-[8px] text-muted-foreground">补丁包已生成，可直接安装使用</div>
                                </div>
                            </div>
                            <div className="mt-4 min-w-0 rounded-lg bg-muted/50 p-2.5">
                                <div className="text-[10px] text-muted-foreground select-none">输出路径</div>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="flex-1 min-w-0 truncate font-mono text-[8px] leading-relaxed text-foreground/80">
                                        {dir}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={handleCopyPath}
                                        className="shrink-0 text-muted-foreground hover:text-foreground"
                                    >
                                        {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-4 min-w-0 border-t pt-3">
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleOpenFolder} className="flex-1 gap-1.5">
                                        <FolderOpen className="size-3.5" />
                                        <span>打开文件夹</span>
                                    </Button>
                                    <Button size="sm" onClick={() => onOpenChange(false)} className="flex-1">
                                        完成
                                    </Button>
                                </div>
                            </div>
                        </>
                    )
                }
                {
                    phase == "error" && (
                        <>
                            <div className="flex items-start gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50">
                                    <XCircle className="size-6 text-red-600" />
                                </div>
                                <div className="flex flex-col gap-1 pt-1 min-w-0">
                                    <div className="text-base leading-none font-semibold">补丁制作失败</div>
                                    <div className="text-[10px] text-muted-foreground">制作过程中出现错误，请重试</div>
                                </div>
                            </div>
                            <div className="mt-4 min-w-0 max-h-24 overflow-y-auto rounded-lg bg-red-50 p-2.5">
                                <div className="text-[10px] text-red-400 select-none">错误信息</div>
                                <div className="mt-1.5 min-w-0 break-all font-mono text-[11px] leading-relaxed text-red-600">
                                    {errorMsg}
                                </div>
                            </div>
                            <div className="mt-4 min-w-0 border-t pt-3">
                                <Button size="sm" onClick={() => onOpenChange(false)} className="w-full">
                                    确定
                                </Button>
                            </div>
                        </>
                    )
                }
            </DialogContent>
        </Dialog>
    )
}
