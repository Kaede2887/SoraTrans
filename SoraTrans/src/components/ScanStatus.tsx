import { PiCircleFill } from "react-icons/pi";

export default function ScanStatus({ status }: { status: number }) {
    switch (status) {
        case 0:
            return <IdleView />;
        case 1:
            return <ScanningView />;
        case 2:
            return <CompletedView />;
        case 3:
            return <StopView />;
        case 4:
            return <FailedView />;
    }
}

function IdleView() {
    return (
        <div className="flex gap-1 items-center">
            <PiCircleFill size={10} color="#989ba3" />
            <span className="text-[10px] text-gray-500 select-none">等待扫描</span>
        </div>
    )
}

function ScanningView() {
    return (
        <div className="flex gap-1 items-center">
            <PiCircleFill size={10} color="#fdb558ff" />
            <span className="text-[10px] text-gray-500 select-none">扫描中</span>
        </div>
    )
}

function CompletedView() {
    return (
        <div className="flex gap-1 items-center">
            <PiCircleFill size={10} color="#4ab865" />
            <span className="text-[10px] text-gray-500 select-none">已扫描</span>
        </div>
    )
}

function StopView() {
    return (
        <div className="flex gap-1 items-center">
            <PiCircleFill size={10} color="#989ba3" />
            <span className="text-[10px] text-gray-500 select-none">已暂停</span>
        </div>
    )
}

function FailedView() {
    return (
        <div className="flex gap-1 items-center">
            <PiCircleFill size={10} color="#f13d46ff" />
            <span className="text-[10px] text-gray-500 select-none">失败</span>
        </div>
    )
}