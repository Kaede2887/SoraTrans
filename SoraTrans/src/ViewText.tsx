import { useEffect, useState } from 'react';
import './Launcher.css'
import TitleBar from "./components/TitleBar";
import { gm } from './utils/GameDbManager';
import FileTree, { FileTreeItem } from './components/FileTree';
import TextTable from './components/ui/text-table';
import { useTextOriginStore } from './model/TextOrigin';
import { useAssetObjectStore } from './model/AssetObjectInfo';
import TextToolBar from './components/TextToolBar';

function ViewText() {

    const title = useTextOriginStore((state)=>state.title)
    const [patternTree, setPatternTree] = useState<FileTreeItem[]>([]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = Number(params.get("objId"));
        const title = String(params.get("title"));
        useAssetObjectStore.getState().setId(id);
        useTextOriginStore.getState().setTitle(title);
        useTextOriginStore.getState().setInitTitle(title);
        const getPatternTree = async ()=>{
            const tree = await gm.selectPatternTree(id)
            setPatternTree(tree ?? [])
            await gm.selectTextAll(id)
        }
        getPatternTree()
    }, [])

    return (
        <div className="flex flex-col h-screen w-screen " onContextMenu={(e) => e.preventDefault()}>
            <TitleBar className='pl-2 pr-4 h-[30px]' title={title} />
            <main className="flex flex-1 w-screen overflow-y-hidden bg-[#f0f1f3] overflow-hidden">
                <div className='px-2 flex flex-1 py-2 gap-2'>
                    <div className='w-[25%] bg-white rounded-sm'>
                        <FileTree fileTree={patternTree} type="pattern"/>
                    </div>
                    <div className='w-[50%] bg-white rounded-sm py-2'>
                        <TextTable/>
                    </div>
                    <div className='w-[25%] bg-white rounded-sm'>
                        <TextToolBar/>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default ViewText;
