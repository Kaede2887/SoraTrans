
import { useFileLogStore } from "@/model/FileLogInfo";
import ExtractRecentFileItem from "./ExtractRecentFileItem";
import { LuFileText } from "react-icons/lu";

export default function ExtractRecentFile() {

    const list = useFileLogStore((state) => state.fileLogList)

    return (
        <div className="w-full h-1/2 bg-white relative rounded-sm overflow-hidden flex flex-col py-2">
            <span className="text-xs text-gray-400 font-semibold w-full h-4 px-2 select-none">最近文件</span>
            {
                list.length > 0 ? (
                    <div className="w-full absolute bottom-2 top-7 space-y-1 px-2 overflow-y-scroll scrollbar-none">
                        {
                            list.map((info) => {
                                return <ExtractRecentFileItem key={info.file} status={info.type} title={info.file} />
                            })
                        }
                    </div>
                ) : (
                    <div className="w-full absolute bottom-2 top-7 space-y-1 px-2 flex flex-col items-center justify-center overflow-y-scroll scrollbar-none">
                        <LuFileText className="text-gray-400 size-6 md:size-8" />
                        <span className="text-xs text-gray-400 select-none">暂无日志</span>
                    </div>
                )
            }

        </div>
    )
}