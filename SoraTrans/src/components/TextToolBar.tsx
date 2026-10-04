import { useTextOriginStore } from "@/model/TextOrigin"
import { gm } from "@/utils/GameDbManager";
import { CheckCircle2, DownloadIcon, Edit, FolderOpen, Loader2, UploadIcon, XCircle } from "lucide-react"
import { ReactNode, useRef, useState } from "react"
import { save, open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import {
    extractTextTemplate,
    LONG_TEXT_THRESHOLD,
    TemplateExportValue,
} from "@/utils/TextTemplate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ExportPhase = "exporting" | "done" | "error"

export default function TextToolBar() {

    const selectTextItem = useTextOriginStore((state) => state.selectTextItem)

    const setSelectTextItem = useTextOriginStore((state)=>state.setSelectTextItem)

    const handleEditBtn = () => {
        if (!selectTextItem?.id) return;
        gm.insertTrans(selectTextItem.id, selectTextItem.trans_text)
        useTextOriginStore.getState().updateListItem(selectTextItem)
    }

    // 导出动画弹窗状态：exporting 旋转动画 / done 完成 / error 失败
    const [exportOpen, setExportOpen] = useState(false)
    const [exportPhase, setExportPhase] = useState<ExportPhase>("exporting")
    const [exportError, setExportError] = useState("")
    const [exportPath, setExportPath] = useState("")
    // 同步守卫：防止保存对话框关闭到弹窗打开之间的重复点击
    const exportingRef = useRef(false)

    const handleExportOpenChange = (open: boolean) => {
        setExportOpen(open);
        if (!open) exportingRef.current = false;
    }

    const handleExportBtn = async () => {
        if (exportingRef.current) return;

        const list = useTextOriginStore.getState().list
        const title = useTextOriginStore.getState().title
        const initTitle = useTextOriginStore.getState().initTitle
        const isSubTitle = initTitle != title
        const filePath = await save({
            title: "导出翻译文件",
            defaultPath: isSubTitle ? `${initTitle}_${title}.json` : `${title}.json`,
            filters: [
                {
                    name: "JSON",
                    extensions: ["json"],
                },
            ],
        });

        if (!filePath) return;

        exportingRef.current = true;
        setExportPath(filePath)
        setExportError("")
        setExportPhase("exporting")
        setExportOpen(true)
        // 先让旋转动画绘制一帧，再执行同步的提取/序列化，
        // 否则数据量大时主线程阻塞，弹窗会直接跳到完成态
        await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))
        );

        try {
            // 统一以 id 为键：
            // 普通文本 -> "id": "原文"
            // 超长文本 -> "id": { "{0}": "日文片段", ... }，同时把日文换成占位符的
            // 模板回写到 text_origin.text_template，数字/标点/编号等结构保留在模板中
            const data: Record<string, string | TemplateExportValue> = {};
            const templateUpdates: { id: number, text_template: string }[] = [];

            for (const text of list) {
                if (text.origin_text.length > LONG_TEXT_THRESHOLD) {
                    // 语言暂时写死日语，后续接用户选择
                    const { template, placeholders } = extractTextTemplate(text.origin_text, "ja");
                    if (Object.keys(placeholders).length > 0) {
                        data[String(text.id)] = placeholders;
                        templateUpdates.push({ id: text.id, text_template: template });
                        continue;
                    }
                }
                data[String(text.id)] = text.origin_text;
            }

            await writeTextFile(filePath, JSON.stringify(data, null, 2));

            if (templateUpdates.length > 0) {
                await gm.updateTextTemplates(templateUpdates);
                const templateMap = new Map(templateUpdates.map(item => [item.id, item.text_template]));
                useTextOriginStore.getState().setList(
                    useTextOriginStore.getState().list.map(item => {
                        const textTemplate = templateMap.get(item.id);
                        return textTemplate !== undefined
                            ? { ...item, text_template: textTemplate }
                            : item;
                    })
                );
            }
            setExportPhase("done")
        } catch (error) {
            // 失败也必须收口到 error 态，不能让弹窗永久停在旋转中
            console.log(`err: ${error}`)
            setExportError(String(error))
            setExportPhase("error")
        }
    }

    const handleImportBtn = async () => {
        const file = await open({
            multiple: false,
            directory: false,
            title: "选择翻译 JSON 文件",
            filters: [
                {
                    name: "JSON",
                    extensions: ["json"],
                },
            ],
        });

        if (!file || Array.isArray(file)) return;

        try {
            const list = useTextOriginStore.getState().list
            const text = await readTextFile(file);
            const data: unknown = JSON.parse(text);
            if (
                typeof data !== "object" ||
                data === null || Array.isArray(data)
            ) {
                throw new Error("JSON 格式错误");
            }
            
            const translationMap = new Map(Object.entries(data));

            const newList = list.map(item => {
                const translated = translationMap.get(item.origin_text);

                if (translated === undefined) { return item; }

                if (typeof translated !== "string") {
                    throw new Error(`"${item.origin_text}" 的翻译不是字符串`);
                }

                return {
                    ...item,
                    trans_text: translated,
                };
            });
            useTextOriginStore.getState().updateList(newList)
            gm.insertBatchTrans(newList)
        } catch (error) {
            console.log(`err: ${error}`)
        }

    }

    //TODO: 打开编辑器编辑

    return (
        <div className="px-2 py-3 flex h-full flex-col gap-1 py-1 overflow-hidden lg:py-4">
            <div className="w-full flex flex-col gap-2 py-1">
                <ToolTitle title="属性" />
                <div className="leading-none flex flex-col gap-1 overflow-hidden">
                    <p className="text-[10px] text-neutral-400 leading-none select-none">id</p>
                    <p className="border px-2 h-6 flex items-center font-mono rounded-sm text-[10px] truncate">{selectTextItem?.id}</p>
                </div>
                <div className="leading-none flex flex-col gap-1 overflow-hidden">
                    <p className="text-[10px] text-neutral-400 leading-none select-none">原文</p>
                    <p className="border px-1 flex h-10 items-center font-san rounded-sm text-[10px]">
                        <textarea defaultValue={selectTextItem?.origin_text ?? ""} disabled={true} className="w-full h-[30px] overflow-y-scroll resize-none flex items-center justify-between font-san text-[10px] scrollbar-none" />
                    </p>
                </div>
                <div className="leading-none flex flex-col gap-1 overflow-hidden">
                    <p className="text-[10px] text-neutral-400 leading-none select-none">译文</p>
                    <p className="border px-1 flex h-10 items-center font-san rounded-sm text-[10px]">
                        <textarea value={selectTextItem?.trans_text ?? ""} onChange={e => {
                                    if (!selectTextItem) return;
                                        setSelectTextItem({
                                            ...selectTextItem,
                                            trans_text: e.target.value,
                                        });
                        }} className="w-full h-[30px] overflow-y-scroll outline-none resize-none flex items-center justify-between font-san text-[10px] scrollbar-none" />
                    </p>
                </div>
                <div>
                    <ToolBtn icon={<Edit size={10} className="text-neutral-500" />} onClick={handleEditBtn} text="修改" />
                </div>
            </div>
            <div className="w-full flex flex-col gap-2 ">
                <ToolTitle title="批量操作" />
                <div className="grid gap-1 md:grid-cols-2 overflow-hidden">
                    <ToolBtn onClick={handleImportBtn} icon={<UploadIcon size={10} className="text-neutral-500" />} text="导入所有译文" />
                    <ToolBtn onClick={handleExportBtn} icon={<DownloadIcon size={10} className="text-neutral-500" />} text="导出所有原文" />
                </div>
            </div>
            <ExportDialog
                open={exportOpen}
                phase={exportPhase}
                errorMsg={exportError}
                filePath={exportPath}
                onOpenChange={handleExportOpenChange}
            />
        </div>
    )
}

// 导出动画弹窗：进行中展示旋转动画且禁止关闭，完成/失败后由用户手动关闭
function ExportDialog({ open, phase, errorMsg, filePath, onOpenChange }: {
    open: boolean,
    phase: ExportPhase,
    errorMsg: string,
    filePath: string,
    onOpenChange: (open: boolean) => void,
}) {
    const guardExporting = (e: Event) => {
        if (phase == "exporting") e.preventDefault()
    }

    const handleOpenFolder = () => {
        if (!filePath) return;
        invoke("open_folder", { path: filePath })
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (phase == "exporting") return;
                onOpenChange(o)
            }}
        >
            <DialogContent
                showCloseButton={phase != "exporting"}
                onEscapeKeyDown={guardExporting}
                onInteractOutside={guardExporting}
                className={`gap-0 rounded-2xl ${phase == "exporting" ? "w-72 p-5" : "w-[340px] p-5"}`}
            >
                {
                    phase == "exporting" && (
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                                <Loader2 className="size-5 animate-spin text-blue-600" />
                            </div>
                            <div className="flex flex-col gap-1 pt-0.5">
                                <div className="text-sm leading-none font-semibold">正在导出</div>
                                <div className="text-[8px] text-muted-foreground">正在生成翻译文件，请勿关闭窗口...</div>
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
                                    <div className="text-sm leading-none font-semibold">导出完成</div>
                                    <div className="text-[8px] text-muted-foreground">翻译文件已成功导出</div>
                                </div>
                            </div>
                            <div className="mt-4 min-w-0 rounded-lg bg-muted/50 p-2.5">
                                <div className="text-[10px] text-muted-foreground select-none">文件路径</div>
                                <div className="mt-1 min-w-0 truncate font-mono text-[8px] leading-relaxed text-foreground/80">
                                    {filePath}
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
                                    <div className="text-base leading-none font-semibold">导出失败</div>
                                    <div className="text-[10px] text-muted-foreground">导出过程中出现错误，请重试</div>
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