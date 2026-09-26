import { useEffect, useRef } from "react";
import { ProjectItem } from "./ProjectItem";
import { useProjectInfoStore } from "@/model/ProjectInfo";
import { useVirtualizer } from "@tanstack/react-virtual";
import SimpleBar from "simplebar-react";
import { manager } from "@/utils/DbManager";

function ProjectList() {

    const itemList = useProjectInfoStore((state) => state.infoList)

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const virtualizer = useVirtualizer({
        count: itemList.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 72,
        overscan: 12,
        getItemKey: (index) => itemList[index]?.id ?? index,
    });

    useEffect(() => {
        manager.selectProjectInfoList()
    }, [])

    return (
        <div className="flex flex-1 min-w-0 min-h-0">
            <div className="flex flex-1 min-w-0 min-h-0">
                {
                    itemList.length != 0 ? (
                        <SimpleBar className="h-full w-full">
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
                                        <div className="p-1"
                                            style={{ height: virtualizer.getTotalSize(), width: "100%", position: 'relative' }}>
                                            {virtualizer.getVirtualItems().map((vi) => {
                                                const row = itemList[vi.index];
                                                return (
                                                    <div key={vi.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }}>
                                                        <ProjectItem info={row} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </SimpleBar>
                    ) : (
                        <div className="flex flex-col flex-1 items-center justify-center">
                            <span className="text-xs text-gray-500 select-none">( ˘ω˘ )…</span>
                            <span className="text-xs text-gray-500 select-none">还没有任何项目哦~</span>
                            <span className="text-xs text-gray-500 select-none">可以点击导入按钮或拖动应用程序导入项目</span>
                        </div>
                    )
                }
            </div>
        </div>

    )
}

export { ProjectList };
