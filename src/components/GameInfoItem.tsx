import BBCode from "@bbob/react";
import reactPreset from "@bbob/preset-react";
import { openUrl } from "@tauri-apps/plugin-opener";

export default function GameInfoItem({ title, data , className }: { title: string, data: any , className: string }) {
    
    return (
        <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold whitespace-nowrap">{title}</p>
            <div onClick={(e) => {
                const target = e.target as HTMLElement;

                if (target.tagName === "A") {
                    e.preventDefault();

                    const href = (target as HTMLAnchorElement).href;

                    openUrl(href);
                }
            }} className={`text-xs text-gray-700 ${className}`}>
                <BBCode plugins={[reactPreset()]}>
                    {data}
                </BBCode>
            </div>
        </div>
    )
}