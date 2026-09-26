import { FiFolder } from "react-icons/fi";
import { convertFileSrc } from '@tauri-apps/api/core';
import ProjectInfo, { useProjectInfoStore } from "@/model/ProjectInfo";

function ProjectItem({ info }: { info: ProjectInfo }) {

    const current = useProjectInfoStore((state) => state.current)

    const src = convertFileSrc(info.icon_path);

    const handleSelectInfo = () => {
        useProjectInfoStore.getState().setCurrent(info.id)
    }

    return (
        <div className="py-[2px] px-[5px]">
            <div onClick={handleSelectInfo} className={`flex flex-row py-2 gap-4 px-3  rounded-sm hover:bg-gray-200/60 min-w-0 ${(current == info.id) && "outline outline-gray-400 bg-gray-200"}`}>
                <img src={src} className="w-12 h-12 rounded-sm shrink-0" />
                <div className="flex flex-grow flex-col overflow-hidden min-w-0">
                    <div className="flex flex-1 items-center justify-between min-w-0 overflow-hidden">
                        <span className="font-semibold select-none flex-grow min-w-0 truncate">{info.title}</span>
                        <span className="text-xs text-[#777777] select-none shrink-0 min-w-0 max-w-[120px] truncate">{info.manufactor}</span>
                    </div>
                    <div className="flex flex-1 gap-1 items-center min-w-0 overflow-hidden">
                        <FiFolder color="#777777" className="w-3 h-3 shrink-0" />
                        <span className="text-xs h-4 text-[#777777] flex-1 min-w-0 select-none truncate">{info.root_path}</span>
                        <span className="text-xs text-[#777777] select-none whitespace-nowrap shrink-0">{info.update_time}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export { ProjectItem };

