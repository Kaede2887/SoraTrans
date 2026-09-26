import { useAssetObjectStore } from "@/model/AssetObjectInfo";
import { TextOrigin, useTextOriginStore } from "@/model/TextOrigin";
import { gm, TextOriginSortMethod } from "@/utils/GameDbManager";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MdArrowDownward, MdArrowUpward } from "react-icons/md";
import SimpleBar from "simplebar-react";

export default function TextTable() {

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const isBackShow = useTextOriginStore((state) => state.isBackShow);
    const name = useTextOriginStore((state) => state.title);
    const list = useTextOriginStore((state) => state.list);
    const objId = useAssetObjectStore((state) => state.id)

    const virtualizer = useVirtualizer({
        count: list.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 28,
        overscan: 12
    });

    const [search, setSearch] = useState<string>("")
    const [isASC, setIsASC] = useState<boolean>()
    const currentSort = useTextOriginStore((state) => state.currentSort)

    const handleSort = async (sort: TextOriginSortMethod) => {
        setIsASC(!isASC)
        useTextOriginStore.getState().setCurrentSort(sort)
        const patternId = useTextOriginStore.getState().currentPatternId

        if (search != "") {
            if (isBackShow) {
                await gm.searchTextWithPatternId(patternId, search, sort)
            } else {
                await gm.searchText(objId, search, sort)
            }
        } else {
            if (isBackShow) {
                await gm.selectTextByPatternId(patternId, sort)
            } else {
                await gm.selectTextAll(objId, sort)
            }
        }

    }

    const handleBackBtn = () => {
        useTextOriginStore.getState().setIsBackShow(false)
        useTextOriginStore.getState().resetTitle()
        gm.selectTextAll(objId)
    }

    useEffect(() => {
        async function handleSearch(val: string) {
            if (isBackShow) {
                const patternId = useTextOriginStore.getState().currentPatternId
                await gm.searchTextWithPatternId(patternId, search, currentSort)
            } else {
                await gm.searchText(objId, val, currentSort)
            }
        }

        if (search != "") {
            handleSearch(search)
        } else {
            if (isBackShow) {
                const patternId = useTextOriginStore.getState().currentPatternId
                gm.selectTextByPatternId(patternId, currentSort)
            } else {
                gm.selectTextAll(objId, currentSort)
            }
        }
    }, [search])

    const handleItemClick = (row:TextOrigin) => {
        useTextOriginStore.getState().setSelectTextItem(row)
    }

    return (
        <div className="flex h-full min-w-0 flex-col">
            <div className="bg-white px-2 h-[30px] relative flex items-center justify-between ">
                {
                    name ? (
                        <div className="flex gap-2">
                            {
                                isBackShow && (
                                    <button onClick={handleBackBtn} className="flex text-[8px] rounded-sm px-1 text-neutral-500 items-center hover:bg-muted/70" >
                                        <ArrowLeft className="size-[10px]" />
                                        <span className="truncate">返回</span>
                                    </button>
                                )
                            }
                            <div className="grid items-center gap-1 text-gray-500 sm:grid-cols-2">
                                <span className="text-[10px] truncate leading-none">{name}</span>
                                <span className="text-[8px] truncate leading-none">共{list.length}项资源</span>
                            </div>
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
            <div className="bg-white z-10 px-2 text-[10px] text-neutral-400 border-b grid gap-2 grid-cols-[40px_minmax(30px,0.5fr)_minmax(30px,0.5fr)]">
                <div onClick={() => handleSort(isASC ? TextOriginSortMethod.IdUp : TextOriginSortMethod.IdDown)} className="flex items-center cursor-pointer select-none">
                    <span>id</span>
                    {currentSort == TextOriginSortMethod.IdUp && (<MdArrowUpward />)}
                    {currentSort == TextOriginSortMethod.IdDown && (<MdArrowDownward />)}
                </div>
                <div onClick={() => handleSort(isASC ? TextOriginSortMethod.OriginUp : TextOriginSortMethod.OriginDown)} className="flex items-center cursor-pointer select-none">
                    <span>原文</span>
                    {currentSort == TextOriginSortMethod.OriginUp && (<MdArrowUpward />)}
                    {currentSort == TextOriginSortMethod.OriginDown && (<MdArrowDownward />)}
                </div>
                <div onClick={() => handleSort(isASC ? TextOriginSortMethod.TransUp : TextOriginSortMethod.TransDown)} className="flex items-center cursor-pointer select-none">
                    <span>译文</span>
                    {currentSort == TextOriginSortMethod.TransUp && (<MdArrowUpward />)}
                    {currentSort == TextOriginSortMethod.TransDown && (<MdArrowDownward />)}
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
                                                <div key={vi.key} onClick={()=>handleItemClick(row)} className="text-xs px-2 gap-2 border-b grid grid-cols-[40px_minmax(30px,0.5fr)_minmax(30px,0.5fr)] hover:bg-muted/50"
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, alignItems: 'center', transform: `translateY(${vi.start}px)` }}>
                                                    <div className="pr-2 truncate font-mono select-none">{row.id}</div>
                                                    <div className="pr-2 truncate font-sans select-none">{row.origin_text}</div>
                                                    <div className="pr-2 truncate font-sans select-none">{row.trans_text}</div>
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
                        <p className="text-xs text-gray-400">(・_・ヾ</p>
                        <p className="text-xs text-gray-400">空空如也...</p>
                    </div>
                )
            }

        </div>
    )
}