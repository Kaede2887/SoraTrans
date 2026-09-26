import { FiEdit, FiTrash } from "react-icons/fi";
import { VscRunCompact } from "react-icons/vsc";
import { RenameDialog } from "./RenameDialog";
import { manager } from "@/utils/DbManager";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useProjectInfoStore } from "@/model/ProjectInfo";

function LauncherSideBar() {

    const id = useProjectInfoStore((state)=>state.current)

    const handleDeleteBtn = async (id: number | null) => {
        if (!id) return;
        await manager.deleteProjectInfo(id)
        useProjectInfoStore.getState().deleteSelectById(id)
    }

    const handleRunBtn = async (id: number | null) => {
        if (!id) return;
        const list = useProjectInfoStore.getState().infoList;
        const info = list.find((info)=>info.id == id);
        if (info) {
            invoke('run_application', { filePath: info.file_path })
        }
    }

    const handleEditBtn = async () => {
        if (!id) return;
        const list = useProjectInfoStore.getState().infoList
        const info = list.find((val)=>val.id == id)
        const webviewWindow = new WebviewWindow('project', {
            url: `editor.html?id=${id}&title=${info?.title}`,
            title: '编辑',
            width: 800,
            height: 520,
            decorations: false,
            minWidth: 486,
            minHeight: 540,
            resizable: true,
            transparent: true,
        });
        webviewWindow.once('tauri://created', async () => {
            console.log("编辑窗口建立成功");
            await getCurrentWindow().hide();
        });
        webviewWindow.once('tauri://error', (e) => {
            console.error("编辑窗口建立失败", e);
        });
        webviewWindow.once("tauri://destroyed", async () => {
            console.log("编辑窗口已关闭");
            await getCurrentWindow().show();
        });
    }

    return (
        <aside className="flex flex-col gap-1 w-25 pr-1 py-2">
            <button onClick={handleEditBtn} disabled={id == null} className='flex relative items-center justify-center cursor-pointer rounded-sm border border-gray-400 px-4 py-1 text-xs hover:bg-gray-200 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none disabled:cursor-default'>
                <FiEdit className="absolute left-2" />
                <span className='pl-1'>编辑</span>
            </button>
            <button onClick={() => handleRunBtn(id)} disabled={id == null} className='flex relative items-center justify-center cursor-pointer rounded-sm border border-gray-400 px-4 py-1 text-xs hover:bg-gray-200 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none disabled:cursor-default'>
                <VscRunCompact className="absolute left-2" />
                <span className='pl-1'>运行</span>
            </button>
            <RenameDialog isDisabled={id == null} id={id ? id : 0} />
            <button onClick={() => handleDeleteBtn(id)} disabled={id == null} className='flex relative items-center justify-center cursor-pointer rounded-sm border border-gray-400 px-4 py-1 text-xs hover:bg-gray-200 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none disabled:cursor-default'>
                <FiTrash className="absolute left-2" />
                <span className='pl-1'>移除</span>
            </button>
        </aside>

    )
}

export { LauncherSideBar }