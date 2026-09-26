export default function ExtractInfoItem({ title, data }: { title: string, data: number }) {
    return (
        <div className="relative py-3 px-2 flex flex-col items-center justify-center bg-gray-100 w-full h-12 rounded-sm">
            <span className={ ` text-center text-justify mb-3 ${data > 0 ? "text-md font-mono":"text-xs sm:text-md font-sans"} font-medium select-none `}>{data > 0 ? `${data.toLocaleString("en-US")}` : "暂无"} </span>
            <span className="absolute top-7 text-xs text-gray-400 select-none truncate">{title}</span>
        </div>
    )
}