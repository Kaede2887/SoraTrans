import { useLogStore } from "@/model/LogInfo";
import ExtractLogInfo from "./ExtractLogInfo";
import { RiFileList3Line } from "react-icons/ri";

export default function ExtractLog() {

    const list = useLogStore((state) => state.logList)

    return (
        <div className="w-full h-1/2 relative bg-white rounded-sm overflow-hidden flex flex-col px-1 py-2">
            <span className="text-xs text-gray-400 font-semibold w-full h-4 px-2 shrink-0 select-none">实时日志</span>
            {
                list.length > 0 ? (
                    <div className="w-full absolute bottom-2 top-7 space-y-1 px-2 overflow-y-scroll scrollbar-none">
                        {
                            list.map((info)=> {
                                return <ExtractLogInfo key={info.id} type={info.type} time={info.time} log={info.log} />
                            })
                        }
                    </div>
                ) : (
                    <div className="w-full absolute bottom-2 top-7 flex flex-col items-center justify-center space-y-1 px-2 overflow-y-scroll scrollbar-none">
                        <RiFileList3Line className="text-gray-400 size-6 md:size-8"/>
                        <span className="text-xs text-gray-400 select-none">暂无日志</span>
                    </div>
                )
            }

        </div>
    )
}