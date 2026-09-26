import { Window } from "@tauri-apps/api/window";
import { useState } from "react"
import { VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore } from "react-icons/vsc"
import logo from '../assets/128x128@2x.png';

export default function TitleBar({
    className,title
}: {className:string,title:string}) {
    const [isMaxmized, setIsMaxmized] = useState<boolean>(false);
    const appWindow = Window.getCurrent();

    const container = `shrink-0 w-screen items-center flex justify-between ${className}`

    const MaxmizeBtn = async () => {
        setIsMaxmized(!isMaxmized);
        await appWindow.toggleMaximize();
    }

    const MinimizeBtn = async () => {
        await appWindow.minimize();
    }

    const CloseBtn = async () => {
        await appWindow.close();
    }

    return (
        <header data-tauri-drag-region className={container}>
            <div className="flex grow h-[40px] items-center gap-1 z-50">
                <img src={logo} className="w-4" data-tauri-drag-region />
                <span className="text-xs select-none truncate grow" data-tauri-drag-region>{title}</span>
            </div>
            <div className="flex w-20 h-[40px] items-center justify-between pointer-events-auto">
                <VscChromeMinimize onClick={MinimizeBtn} size={20} className="cursor-pointer" />
                {isMaxmized ? <VscChromeRestore onClick={MaxmizeBtn} size={20} className="cursor-pointer" /> : <VscChromeMaximize onClick={MaxmizeBtn} size={16} className="cursor-pointer" />}
                <VscChromeClose onClick={CloseBtn} size={16} className="cursor-pointer" />
            </div>
        </header>
    )
}