import AssetObjectInfo, { useAssetObjectStore } from "@/model/AssetObjectInfo";
import { AssetObjSortMethod, gm } from "@/utils/GameDbManager";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDownIcon, FilterIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MdArrowDownward, MdArrowUpward } from "react-icons/md";
import SimpleBar from "simplebar-react";

interface AssetSelector {
    assets: { id: number, name: string }[]
    selectedId: number
    onSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export default function AssetObjTable({ list, name, id, assetSelector }: {
    list: AssetObjectInfo[], name: string, id: number, assetSelector?: AssetSelector
}) {

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const virtualizer = useVirtualizer({
        count: list.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 28,
        overscan: 12
    });

    const [search, setSearch] = useState<string>("")
    const [isASC, setIsASC] = useState<boolean>()
    const [showFilter, setShowFilter] = useState(false)
    const [showAssetMenu, setShowAssetMenu] = useState(false)
    // 列宽：名称 / 类型 / PathID / 大小 / 行数 / 修改
    const [colWidths, setColWidths] = useState<number[]>([200, 70, 60, 50, 40, 30])
    const [allTypes, setAllTypes] = useState<string[]>([])
    const [typeFilterReady, setTypeFilterReady] = useState(false)
    const currentSort = useAssetObjectStore((state)=> state.currentSort)
    const setCurrentSort = useAssetObjectStore((state)=>state.setCurrentSort)
    const setSelectAssetObj = useAssetObjectStore((state)=>state.setSelectAssetObj)
    const typeFilter = useAssetObjectStore((state)=>state.typeFilter)
    const setTypeFilter = useAssetObjectStore((state)=>state.setTypeFilter)

    // 独立查询全部类型，不随过滤变化——避免勾选一个类型后菜单选项跟着变
    useEffect(() => {
        setTypeFilterReady(false)
        gm.selectDistinctTypes(id).then(types => {
            setAllTypes(types)
            // 默认全选
            setTypeFilter(new Set(types))
            setTypeFilterReady(true)
        })
    }, [id])

    const handleTypeToggle = (type: string) => {
        const next = new Set(typeFilter);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        setTypeFilter(next);
    }

    const handleSelectAll = () => {
        setTypeFilter(new Set(allTypes));
    }

    const handleDeselectAll = () => {
        setTypeFilter(new Set());
    }

    // 初始化前 undefined（不过滤，等全选默认值生效）；初始化后空数组 = 什么都不展示
    const activeTypes = typeFilterReady ? (typeFilter.size > 0 ? Array.from(typeFilter) : []) : undefined;

    const handleSort = async (sort: AssetObjSortMethod) => {
        setIsASC(!isASC)
        setCurrentSort(sort)

        if (search != "") {
            await gm.searchAssetObjByName(id, search, sort, activeTypes)
        } else {
            await gm.selectAssetObjectList(id, sort, activeTypes)
        }
    }

    const handleModSort = (sort: AssetObjSortMethod) => {
        setCurrentSort(sort)
        useAssetObjectStore.getState().sortListByMod()
    }

    // 拖拽调整列宽
    const startResize = (idx: number, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const startX = e.clientX
        const startW = colWidths[idx]
        const onMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX
            setColWidths(prev => {
                const arr = [...prev]
                arr[idx] = Math.max(24, startW + delta)
                return arr
            })
        }
        const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }

    const colTemplate = colWidths.map(w => `${w}px`).join(' ')

    const ColResizer = ({ idx }: { idx: number }) => (
        <div
            onMouseDown={(e) => startResize(idx, e)}
            className="absolute right-0 top-0 h-full w-[3px] cursor-col-resize hover:bg-blue-400/50 z-10"
        />
    )

    useEffect(() => {
        async function handleSearch(val: string) {
            await gm.searchAssetObjByName(id, val, currentSort, activeTypes)
        }

        if (search != "") {
            handleSearch(search)
        } else {
            gm.selectAssetObjectList(id, currentSort, activeTypes)
        }
    }, [search, typeFilter])

    return (
        <div className="flex h-full min-w-0 flex-col ">
            <div className="bg-white px-2 h-[30px] relative flex items-center justify-between ">
                {
                    name ? (
                        <div className="flex items-center gap-2 text-gray-500 min-w-0">
                            {assetSelector && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowAssetMenu(v => !v)}
                                        className="flex h-[20px] max-w-[200px] border rounded-sm items-center gap-1 px-1 text-[10px] text-neutral-600 font-medium hover:bg-muted/50 cursor-pointer"
                                    >
                                        <span className="truncate">
                                            {assetSelector.assets.find(a => a.id === assetSelector.selectedId)?.name ?? "全部资源"}
                                        </span>
                                        <ChevronDownIcon className="size-2 text-neutral-400 shrink-0" />
                                    </button>
                                    {showAssetMenu && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setShowAssetMenu(false)} />
                                            <div className="absolute left-0 top-[22px] z-30 bg-white border rounded-md shadow-lg p-1 w-[200px]">
                                                <SimpleBar className="max-h-[200px]">
                                                    <div className="pr-1">
                                                        <button
                                                            onClick={() => { assetSelector.onSelect({ target: { value: "0" } } as React.ChangeEvent<HTMLSelectElement>); setShowAssetMenu(false) }}
                                                            className={`flex w-full items-center gap-1.5 py-0.5 cursor-pointer hover:bg-muted/40 rounded px-1 ${assetSelector.selectedId === 0 ? "text-neutral-900 font-medium" : "text-neutral-600"}`}
                                                        >
                                                            <span className="text-[10px] truncate">全部资源</span>
                                                        </button>
                                                        {assetSelector.assets.map(a => (
                                                            <button
                                                                key={a.id}
                                                                onClick={() => { assetSelector.onSelect({ target: { value: String(a.id) } } as React.ChangeEvent<HTMLSelectElement>); setShowAssetMenu(false) }}
                                                                className={`flex w-full items-center gap-1.5 py-0.5 cursor-pointer hover:bg-muted/40 rounded px-1 ${assetSelector.selectedId === a.id ? "text-neutral-900 font-medium" : "text-neutral-600"}`}
                                                            >
                                                                <span className="text-[10px] truncate">{a.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </SimpleBar>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            <span className="text-[8px] truncate leading-none shrink-0">共{list.length}项</span>
                        </div>
                    ) : (
                        <div>
                        </div>
                    )
                }
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <button onClick={() => setShowFilter(!showFilter)} className="flex h-[20px] w-[20px] border rounded-sm items-center justify-center text-[10px] text-neutral-500 hover:bg-muted/50">
                            <FilterIcon className="size-2" />
                        </button>
                        {showFilter && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowFilter(false)} />
                                <div className="absolute left-0 top-[22px] z-30 bg-white border rounded-md shadow-lg p-2 w-[160px]">
                                    <div className="flex gap-1 mb-1 pb-1 border-b">
                                        <button onClick={handleSelectAll} className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600">全选</button>
                                        <button onClick={handleDeselectAll} className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600">取消全选</button>
                                    </div>
                                    <SimpleBar className="max-h-[160px]">
                                        <div className="pr-1">
                                            {allTypes.map(t => (
                                                <label key={t} className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-muted/40 rounded px-1">
                                                    <input type="checkbox" checked={typeFilter.has(t)} onChange={() => handleTypeToggle(t)} className="size-2.5" />
                                                    <span className="text-[10px] text-neutral-600 truncate">{t}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </SimpleBar>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex h-[20px] border rounded-sm items-center px-1">
                        <SearchIcon className="size-2 text-neutral-400" />
                        <input onChange={e => setSearch(e.target.value)} className="pl-1 h-[10px] text-[10px] text-neutral-400 grow outline-none" placeholder="筛选资源名称..." />
                    </div>
                </div>
            </div>
            <div className="bg-white z-10 px-2 text-[10px] text-neutral-400 border-b grid gap-2" style={{ gridTemplateColumns: colTemplate }}>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.NameUp : AssetObjSortMethod.NameDown)} className="relative flex items-center cursor-pointer select-none overflow-hidden">
                    <span className="truncate">名称</span>
                    {currentSort == AssetObjSortMethod.NameUp && (<MdArrowUpward className="shrink-0" />)}
                    {currentSort == AssetObjSortMethod.NameDown && (<MdArrowDownward className="shrink-0" />)}
                    <ColResizer idx={0} />
                </div>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.TypeUp : AssetObjSortMethod.TypeDown)} className="relative flex items-center cursor-pointer select-none overflow-hidden">
                    <span className="truncate">类型</span>
                    {currentSort == AssetObjSortMethod.TypeUp && (<MdArrowUpward className="shrink-0" />)}
                    {currentSort == AssetObjSortMethod.TypeDown && (<MdArrowDownward className="shrink-0" />)}
                    <ColResizer idx={1} />
                </div>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.PathIdUp : AssetObjSortMethod.PathIdDown)} className="relative flex items-center cursor-pointer select-none overflow-hidden">
                    <span className="truncate">PathID</span>
                    {currentSort == AssetObjSortMethod.PathIdUp && (<MdArrowUpward className="shrink-0" />)}
                    {currentSort == AssetObjSortMethod.PathIdDown && (<MdArrowDownward className="shrink-0" />)}
                    <ColResizer idx={2} />
                </div>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.SizeUp : AssetObjSortMethod.SizeDown)} className="relative flex items-center cursor-pointer select-none overflow-hidden">
                    <span className="truncate">大小</span>
                    {currentSort == AssetObjSortMethod.SizeUp && (<MdArrowUpward className="shrink-0" />)}
                    {currentSort == AssetObjSortMethod.SizeDown && (<MdArrowDownward className="shrink-0" />)}
                    <ColResizer idx={3} />
                </div>
                <div onClick={() => handleSort(isASC ? AssetObjSortMethod.LineUp : AssetObjSortMethod.LineDown)} className="relative flex items-center cursor-pointer select-none overflow-hidden">
                    <span className="truncate">行数</span>
                    {currentSort == AssetObjSortMethod.LineUp && (<MdArrowUpward className="shrink-0" />)}
                    {currentSort == AssetObjSortMethod.LineDown && (<MdArrowDownward className="shrink-0" />)}
                    <ColResizer idx={4} />
                </div>
                <div onClick={() => handleModSort(AssetObjSortMethod.ModDown)} className="relative flex items-center cursor-pointer select-none overflow-hidden">
                    <span className="truncate">修改</span>
                    {currentSort == AssetObjSortMethod.ModDown && (<MdArrowDownward className="shrink-0" />)}
                    <ColResizer idx={5} />
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
                                                <div key={vi.key} onClick={()=>setSelectAssetObj(row)} className="text-xs px-2 gap-2 border-b grid hover:bg-muted/50"
                                                    style={{ gridTemplateColumns: colTemplate, position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, alignItems: 'center', transform: `translateY(${vi.start}px)` }}>
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