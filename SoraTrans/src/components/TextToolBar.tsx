import { useTextOriginStore } from "@/model/TextOrigin"
import { gm } from "@/utils/GameDbManager";
import { DownloadIcon, Edit, UploadIcon } from "lucide-react"
import { ReactNode } from "react"
import { save, open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export default function TextToolBar() {

    const selectTextItem = useTextOriginStore((state) => state.selectTextItem)

    const setSelectTextItem = useTextOriginStore((state)=>state.setSelectTextItem)

    const handleEditBtn = () => {
        if (!selectTextItem?.id) return;
        gm.insertTrans(selectTextItem.id, selectTextItem.trans_text)
        useTextOriginStore.getState().updateListItem(selectTextItem)
    }

    const handleExportBtn = async () => {
        const list = useTextOriginStore.getState().list
        const title = useTextOriginStore.getState().title
        const initTitle = useTextOriginStore.getState().initTitle
        const isSubTitle = initTitle != title
        const path = await save({
            title: "导出翻译文件",
            defaultPath: isSubTitle ? `${initTitle}_${title}.json` : `${title}.json`,
            filters: [
                {
                    name: "JSON",
                    extensions: ["json"],
                },
            ],
        });

        if (!path) return;

        try {
            const data = Object.fromEntries(
                list.map(text => [text.origin_text, text.origin_text])
            );
            await writeTextFile(path, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log(`err: ${error}`)
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