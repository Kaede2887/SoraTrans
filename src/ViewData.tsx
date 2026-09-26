import { useEffect, useState } from 'react';
import './Launcher.css'
import TitleBar from "./components/TitleBar";
import DataTree from './components/DataTree';

function ViewData() {

    const [title,setTitle] = useState<string>("")
    const [id,setId] = useState<number>();

    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        const id = Number(params.get("id"));
        const title = String(params.get("title"));
        setId(id);
        setTitle(title);
    },[])

    return (
        <div className="flex flex-col h-screen w-screen " onContextMenu={(e) => e.preventDefault()}>
            <TitleBar className='pl-2 pr-4 h-[30px]' title={title} />
            <main className="flex flex-1 w-screen overflow-y-hidden">
                <DataTree id={id} title={title}/>
            </main>
        </div>
    );
}

export default ViewData;
