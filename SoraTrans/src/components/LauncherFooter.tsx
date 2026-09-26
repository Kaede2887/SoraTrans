import { useEffect, useState } from "react"
import { getVersion } from "@tauri-apps/api/app";

export default function LauncherFooter({className}:{className:string}) {
    const [version,setVersion] = useState<string>();
    
    useEffect(()=>{
        const getVer = async () => {
            const ver = await getVersion();
            setVersion(`SoraTrans Ver ${ver}`)
        }

        getVer()
    },[])

    return(
        <div className={className}>
            <span>{version}</span>
        </div>
    )
}