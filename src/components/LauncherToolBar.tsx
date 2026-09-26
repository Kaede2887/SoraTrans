import { Select } from "./ui/select";
import { FiFolderPlus } from "react-icons/fi";
import { LuSearch } from "react-icons/lu";
import { SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { useEffect, useState } from "react";
import { open } from '@tauri-apps/plugin-dialog';
import * as path from "@tauri-apps/api/path";
import {
    error,
} from '@tauri-apps/plugin-log';
import { manager } from "@/utils/DbManager";
import { SortMode, useProjectInfoStore } from "@/model/ProjectInfo";
import { ScanInfo, useScanInfoStore } from "@/model/ScanInfo";
import { invoke } from "@tauri-apps/api/core";

export default function LauncherToolBar({className}:{className:string}) {
    const [isSearchFocus, setIsSearchFocus] = useState(false)

    const [searchVal,setSearchVal] = useState<string>("")

    const SearchFocus = () => {
        setIsSearchFocus(true)
    }

    const SearchBlur = () => {
        setIsSearchFocus(false)
    }

    const handleImportBtn = async () => {
        try {
            const filepath = await open({
                filters: [{ name: '应用程序', extensions: ['exe'] }],
                multiple: false,
                directory: false,
            })

            if (!filepath) return;

            const name = await path.basename(filepath);

            const title = name.split(".")[0];

            manager.insertProjectInfo(filepath,title)

        } catch (e) {
            error(`导入项目失败:${e}`)
        }
    }

    const handleScanBtn = async () => {
        try {
            useScanInfoStore.getState().setList(null)
            const dir = await open({
                multiple: false,
                directory: true,
            })
            if (!dir) return;
            useScanInfoStore.getState().setOpenScanDialog(true)
            invoke("scan_info",{dir:dir}).then((val)=>{
                const info: ScanInfo[] = val as ScanInfo[];
                useScanInfoStore.getState().setList(info)
            })
        } catch (e) {
            error(`扫描项目失败:${e}`)
        }
    }

    const handleSortBtn = async (mode: SortMode) =>{
        useProjectInfoStore.getState().setCurrentSortMode(mode)
        if (searchVal == "") {
            await manager.selectProjectInfoList()
        } else {
            await manager.searchProjectInfo(searchVal)
        }
    }

    useEffect(()=>{
        async function handleSearch(val:string){
            await manager.searchProjectInfo(val)
        }

        async function handleEmpty(){
            await manager.selectProjectInfoList()
        }

        if (searchVal != "") {
            handleSearch(searchVal)
        } else {
            handleEmpty()
        }
    },[searchVal])

    return (
        <div className={className}>
            <button onClick={handleImportBtn} className='flex items-center cursor-pointer rounded-sm border border-gray-400 px-4 py-1 text-xs hover:bg-gray-200'>
                <FiFolderPlus />
                <span className='pl-1 text-ellipsis whitespace-nowrap overflow-hidden'>导入</span>
            </button>
            <button onClick={handleScanBtn} className='flex items-center cursor-pointer rounded-sm border border-gray-400 px-4 py-1 text-xs hover:bg-gray-200'>
                <LuSearch />
                <span className='pl-1 text-ellipsis whitespace-nowrap overflow-hidden'>扫描</span>
            </button>
            <div className={`flex flex-grow min-w-12 items-center gap-1 rounded-sm text-xs py-1 px-1   ${isSearchFocus ? "border border-blue-600 bg-[#f8fafc]" : `border border-gray-400 ${searchVal == "" ? "bg-gray-200" : "bg-white"}`}`}>
                <LuSearch className="min-w-3 min-h-3"/>
                <input placeholder='搜索' onFocus={SearchFocus} onBlur={SearchBlur} value={searchVal} onChange={e => setSearchVal(e.target.value)} type="text" autoComplete="off" className={`flex-grow text-xs min-w-0 outline-none border-none bg-transparent`} />
            </div>
            <div className='gap-2 flex items-center justify-center'>
                <span className='text-xs text-ellipsis whitespace-nowrap overflow-hidden'>排序:</span>
                <Select defaultValue={"修改时间"}>
                    <SelectTrigger className="w-24 text-xs border-gray-400">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent position="popper" className="w-24 text-xs items-center justify-center">
                        <SelectItem value="修改时间" onClick={()=>handleSortBtn(SortMode.Time)} className="h-7 px-2 py-0 text-xs">
                            修改时间
                        </SelectItem>

                        <SelectItem value="项目名称" onClick={()=>handleSortBtn(SortMode.Name)} className={`h-7 px-2 py-0 text-xs`}>
                            项目名称
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}