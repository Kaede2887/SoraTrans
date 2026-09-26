import { LauncherSideBar } from "@/components/LauncherSideBar";
import LauncherToolBar from "@/components/LauncherToolBar";
import { ProjectList } from "@/components/ProjectList";
import { useEffect } from "react";
import LauncherFooter from "@/components/LauncherFooter";
import { ScanDialog } from "@/components/ScanDialog";
import { useScanInfoStore } from "@/model/ScanInfo";
import { getCurrentWindow } from "@tauri-apps/api/window";

function LauncherView() {

    const scanData = useScanInfoStore((state)=>state.list)

    useEffect(() => {
        const init = async () => {
            const window = getCurrentWindow();
            const isVisible = await window.isVisible()
            if (!isVisible) {
                window.show();
            }
        }
        init();
    }, []);

    return (
        <div className="w-full h-full">
            <div className="flex flex-col w-screen h-full">
                <LauncherToolBar className="flex items-center shrink-0 gap-2 h-[30px] px-4 overflow-hidden" />
                <div className='flex flex-1 flex-row-reverse w-screen gap-2 px-3 min-h-0'>
                    <LauncherSideBar />
                    <ProjectList />
                </div>
                <LauncherFooter className="w-screen flex shrink-0 text-xs text-gray-400 justify-end px-2" />
            </div>
            <ScanDialog data={scanData} />
        </div>
    );
}

export { LauncherView }