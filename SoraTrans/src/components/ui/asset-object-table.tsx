import AssetObjectInfo, { useAssetObjectStore } from "@/model/AssetObjectInfo";
import { AssetObjSortMethod, gm } from "@/utils/GameDbManager";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MdArrowDownward, MdArrowUpward } from "react-icons/md";
import SimpleBar from "simplebar-react";

export default function AssetObjTable({ list, name, id }: { list: AssetObjectInfo[], name: string, id: number }) {

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const virtualizer = useVirtualizer({
        count: list.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 28,
        overscan: 12
    });

    const [search, setSearch] = useState<string>("")
    const [isASC, setIsASC] = useState<boolean>()
    const currentSort = useAssetObjectStore((state)=> state.currentSort)
    const setCurrentSort = useAssetObjectStore((state)=>state.setCurrentSort)
    const setSelectAssetObj = useAssetObjectStore((state)=>state.setSelectAssetObj)

    const handleSort = async (sort: AssetObjSortMethod) => {
        setIsASC(!isASC)
        setCurrentSort(sort)

        if (search != "") {
            await gm.searchAssetObjByName(id, search, sort)
        } else {
            await gm.selectAssetObjectList(id, sort)
        }
    }

    const handleModSort = (sort: AssetObjSortMethod) => {
        setCurrentSort(sort)
        useAssetObjectStore.getState().sortListByMod()
    }

    useEffect(() => {
        async function handleSearch(val: string) {
            await gm.searchAssetObjByName(id, val, currentSort)
        }

        if (search != "") {
            handleSearch(search)
        } else {
            gm.selectAssetObjectList(id, currentSort)
        }
    }, [search])

    return (
        <div className="flex h-full min-w-0 flex-col ">
            <div className="bg-white px-2 h-[30px] relative flex items-center justify-between ">
                {
                    name ? (
                        <div className="grid items-center gap-1 text-gray-500 sm:grid-cols-2">
                            <span className="text-[10px] truncate leading-none">{name}</span>
                            <span className="text-[8px] truncate leading-none">共{list.length}项资源</span>
                        </div>
                    ) : (
                        <div>
                        </div>
                    )
                }
                <div className="flex h-[20px] border rounded-sm items-center px-1">
                    <SearchIcon className="size-2 text-neutral-400" />
                    <input onChange={e => setSearch(e.target.value)} className="pl-1 h-[10px] text-[10px] text-neutral-400 grow outline-none" placeholder="筛选资源名称..." />
                </div>
            </div>
            <div className="bg-white z-10 px-2 text-[10px] text-neutral-400 border-b grid gap-2 grid-cols-[minmax(30px,1fr)_70px_40px_50px_40px_30px]">
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.NameUp : AssetObjSortMethod.NameDown)} className="flex items-center cursor-pointer select-none">
                    <span>名称</span>
                    {currentSort == AssetObjSortMethod.NameUp && (<MdArrowUpward />)}
                    {currentSort == AssetObjSortMethod.NameDown && (<MdArrowDownward />)}
                </div>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.TypeUp : AssetObjSortMethod.TypeDown)} className="flex items-center cursor-pointer select-none">
                    <span>类型</span>
                    {currentSort == AssetObjSortMethod.TypeUp && (<MdArrowUpward />)}
                    {currentSort == AssetObjSortMethod.TypeDown && (<MdArrowDownward />)}
                </div>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.PathIdUp : AssetObjSortMethod.PathIdDown)} className="flex items-center cursor-pointer select-none">
                    <span>PathID</span>
                    {currentSort == AssetObjSortMethod.PathIdUp && (<MdArrowUpward />)}
                    {currentSort == AssetObjSortMethod.PathIdDown && (<MdArrowDownward />)}
                </div>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.SizeUp : AssetObjSortMethod.SizeDown)} className="flex items-center cursor-pointer select-none">
                    <span>大小</span>
                    {currentSort == AssetObjSortMethod.SizeUp && (<MdArrowUpward />)}
                    {currentSort == AssetObjSortMethod.SizeDown && (<MdArrowDownward />)}
                </div>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.LineUp : AssetObjSortMethod.LineDown)} className="flex items-center cursor-pointer select-none">
                    <span>行数</span>
                    {currentSort == AssetObjSortMethod.LineUp && (<MdArrowUpward />)}
                    {currentSort == AssetObjSortMethod.LineDown && (<MdArrowDownward />)}
                </div>
                <div onClick={() => handleModSort(AssetObjSortMethod.ModDown)} className="flex items-center cursor-pointer select-none">
                    <span>修改</span>
                    {currentSort == AssetObjSortMethod.ModDown && (<MdArrowDownward />)}
                </div>
            </div>
            {
                list.length > 0 ? (
                    <SimpleBar className="h-full w-full overflow-x-hidden">
                        {({ scrollableNodeProps, contentNodeProps }) => (
                            <div
                                {...scrollableNodeProps}
                                ref={(el) => {
                                    scrollRef.current = el;
                                    scrollableNodeProps.ref.current = el ?? undefined;
                                }}
                            >
                                <div
                                    {...contentNodeProps}
                                    ref={(el) => {
                                        contentNodeProps.ref.current = el ?? undefined;
                                    }}
                                >
                                    <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: 'relative' }}>
                                        {virtualizer.getVirtualItems().map((vi) => {
                                            const row = list[vi.index];
                                            return (
                                                <div key={vi.key} onClick={()=>setSelectAssetObj(row)} className="text-xs px-2 gap-2 border-b grid grid-cols-[minmax(30px,1fr)_70px_40px_50px_40px_30px] hover:bg-muted/50"
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, alignItems: 'center', transform: `translateY(${vi.start}px)` }}>
                                                    <div className="pr-2 truncate font-sans select-none">{row.name}</div>
                                                    <div className="bg-[#efefef] py-[2px] px-[4px] rounded-xs select-none text-[#6a6a6a] text-[9px] flex items-center justify-center">{row.type}</div>
                                                    <div className="font-mono select-none truncate">{row.path_id}</div>
                                                    <div className="font-mono select-none">{row.size}</div>
                                                    <div className="font-mono select-none">{row.line_count}</div>
                                                    <div className="font-mono select-none">{row.isMod ? "*" : ""}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </SimpleBar>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <p className="text-xs text-gray-400 select-none">(・_・ヾ</p>
                        <p className="text-xs text-gray-400 select-none">空空如也...</p>
                    </div>
                )
            }

        </div>
    )
}