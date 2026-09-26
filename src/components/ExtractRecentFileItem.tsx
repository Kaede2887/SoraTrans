import { memo } from "react";
import { FiFile } from "react-icons/fi"

export type FileStatus = "completed" | "wait" | "handle" | "failed"

const ExtractRecentFileItem = memo(function ExtractRecentFileItem({ status, title }: { status: FileStatus, title: string }) {
    switch (status) {
        case "completed":
            return <CompletedView title={title} />
        case "wait":
            return <WaitView title={title} />
        case "handle":
            return <HandleView title={title} />
        case "failed":
            return <FailedView title={title} />
    }
})

export default ExtractRecentFileItem

function CompletedView({ title }: { title: string }) {
    return (
        <div className="flex items-center justify-between bg-gray-100/70 px-2 h-6 rounded-xs">
            <div className="flex items-center gap-1 max-w-[70%]">
                <FiFile className="text-green-400 w-4 h-4 shrink-0 sm:size-3"/>
                <span className="text-xs truncate select-none">{title}</span>
            </div>
            <span className="text-[8px] sm:text-[10px] bg-green-200 text-green-400 text-semibold px-[4px] rounded-xs h-4 flex items-center whitespace-nowrap justify-center select-none">已扫描</span>
        </div>
    )
}

function WaitView({ title }: { title: string }) {
    return (
        <div className="flex items-center justify-between bg-gray-100/70 px-2 h-6 rounded-xs">
            <div className="flex items-center gap-1 max-w-[70%]">
                <FiFile className="text-gray-400 w-4 h-4 shrink-0 sm:size-3"/>
                <span className="text-xs truncate select-none">{title}</span>
            </div>
            <span className="text-[8px] sm:text-[10px] bg-gray-200 text-gray-400 text-semibold px-[4px] rounded-xs h-4 flex items-center justify-center select-none">等待</span>
        </div>
    )
}

function HandleView({ title }: { title: string }) {
    return (
        <div className="flex items-center justify-between bg-gray-100/70 px-2 h-6 rounded-xs">
            <div className="flex items-center gap-1 max-w-[70%]">
                <FiFile className="text-orange-400 w-4 h-4 shrink-0 sm:size-3"/>
                <span className="text-xs truncate select-none">{title}</span>
            </div>
            <span className="text-[8px] sm:text-[10px] bg-orange-100 text-orange-400 text-semibold px-[4px] rounded-xs h-4 flex items-center justify-center select-none">扫描中</span>
        </div>
    )
}

function FailedView({ title }: { title: string }) {
    return (
        <div className="flex items-center justify-between bg-gray-100/70 px-2 h-6 rounded-xs">
            <div className="flex items-center gap-1 max-w-[70%]">
                <FiFile className="text-red-400 w-4 h-4 shrink-0 sm:size-3"/>
                <span className="text-xs truncate select-none">{title}</span>
            </div>
            <span className="text-[8px] sm:text-[10px] bg-red-200 text-red-400 text-semibold px-[4px] rounded-xs h-4 flex items-center justify-center select-none">失败</span>
        </div>
    )
}

