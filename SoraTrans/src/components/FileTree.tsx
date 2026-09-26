import { ChevronRightIcon, FileIcon, FolderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVirtualizer } from "@tanstack/react-virtual";
import { createStore } from "zustand";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { gm } from "@/utils/GameDbManager";
import { useAssetObjectStore } from "@/model/AssetObjectInfo";
import { useTextOriginStore } from "@/model/TextOrigin";

export type FileTreeItem = { id: number, name: string, line: number } | { id: number, name: string, line: number; items: FileTreeItem[] }

type FileTreeStoreState = { list: FileTreeItem[] }

type FileTreeStoreActions = {
    setList: (val: FileTreeStoreState['list']) => void
}

type FileTreeStore = FileTreeStoreState & FileTreeStoreActions

export const useFileTreeStore = createStore<FileTreeStore>()(
    (set) => ({
        list: [],
        setList: (val) => set({ list: val })
    }),
)

type FlatRow = {
    key: string
    item: FileTreeItem
    depth: number
    isFolder: boolean
}

function flatten(items: FileTreeItem[], expanded: ReadonlySet<string>): FlatRow[] {
    const out: FlatRow[] = [];
    const walk = (list: FileTreeItem[], depth: number, parentKey: string) => {
        for (const item of list) {
            const key = parentKey ? `${parentKey}/${item.name}` : item.name;
            const isFolder = "items" in item;
            out.push({ key, item, depth, isFolder });
            if (isFolder && expanded.has(key)) {
                walk(item.items, depth + 1, key);
            }
        }
    };
    walk(items, 0, "");
    return out;
}

const ROW_HEIGHT = 28;

type TreeRowProps = {
    row: FlatRow
    expanded: boolean
    onToggle: (key: string) => void
    handleBtn: (id: number, name: string) => void
    style: React.CSSProperties
}

const TreeRow = memo(function TreeRow({ row, expanded, onToggle, handleBtn, style }: TreeRowProps) {
    const { item, depth, isFolder, key } = row;

    return (
        <div style={style}>
            <Button
                variant="ghost"
                size="xs"
                onClick={isFolder ? () => onToggle(key) : () => handleBtn(item.id, item.name)}
                className="group w-full rounded-sm relative justify-start transition-none hover:bg-accent hover:text-accent-foreground"
                style={{ paddingLeft: 8 + depth * 6 }}
            >
                {isFolder ? (
                    <ChevronRightIcon className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
                ) : (
                    depth > 0 && <ChevronRightIcon className="invisible" />
                )}
                {isFolder ? <FolderIcon /> : <FileIcon />}
                <span className="text-xs truncate max-w-[80%] z-10 font-san">{item.name}</span>
                <span className="absolute font-mono right-1 z-20 text-[10px] px-[6px] text-transparent group-hover:text-gray-400 group-hover:bg-gray-200 group-hover:rounded-md">{item.line}</span>
            </Button>
        </div>
    )
})

type FileTreeType = "asset" | "pattern"

export default function FileTree({ fileTree, type }: { fileTree: FileTreeItem[], type: FileTreeType }) {

    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

    const scrollRef = useRef<HTMLElement | null>(null);

    const rows = useMemo(() => flatten(fileTree, expanded), [fileTree, expanded]);

    const toggle = useCallback((key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const handleAssetBtn = (id: number, name: string) => {
        useAssetObjectStore.getState().setAssetName(name)
        useAssetObjectStore.getState().setAssetId(id)
        const currentSort = useAssetObjectStore.getState().currentSort
        gm.selectAssetObjectList(id, currentSort)
    }

    const handlePatternBtn = (id: number, name: string) => {
        useTextOriginStore.getState().setIsBackShow(true)
        useTextOriginStore.getState().setTitle(name)
        useTextOriginStore.getState().setCurrentPatternId(id)
        gm.selectTextByPatternId(id)
    }

    const handleBtn = (id: number, name: string) => {
        switch (type) {
            case "asset":
                return handleAssetBtn(id, name)
            case "pattern":
                return handlePatternBtn(id, name)
        }
    }

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 12,
    });

    return (
        <div className="w-full h-full overflow-hidden">
            <div className="h-[6%] flex items-center px-3">
                <span className="text-xs font-semibold">资源树</span>
            </div>
            {
                rows.length > 0 ? (
                    <SimpleBar className="h-[94%] w-full">
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
                                    <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                                        {virtualizer.getVirtualItems().map((vi) => {
                                            const row = rows[vi.index];
                                            return (
                                                <TreeRow
                                                    key={row.key}
                                                    row={row}
                                                    expanded={expanded.has(row.key)}
                                                    onToggle={toggle}
                                                    handleBtn={handleBtn}
                                                    style={{
                                                        position: "absolute",
                                                        top: 0,
                                                        left: 0,
                                                        width: "100%",
                                                        height: vi.size,
                                                        transform: `translateY(${vi.start}px)`,
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </SimpleBar>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <p className="text-xs text-gray-400 select-none">空空如也...</p>
                        <p className="text-xs text-gray-400 select-none">请先进行扫描</p>
                    </div>
                )
            }

        </div>
    )
}
