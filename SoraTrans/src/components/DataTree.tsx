import { assetApi } from "@/utils/AssetApi"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Loader2 } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Segment, ViewTreeNode, useViewTreeStore } from "@/model/ViewNode";

type FlatRow =
    | { kind: "node"; node: ViewTreeNode; depth: number }
    | { kind: "error"; message: string; depth: number }

interface TreeMetrics {
    fontSize: number
    rowHeight: number
    indent: number
    chevron: number
    badgeFontSize: number
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// 根据窗口宽度推导整树的尺寸指标：600px 时 11px，1400px 时 14px，之间线性插值
function useTreeMetrics(): TreeMetrics {
    const [winWidth, setWinWidth] = useState(() => window.innerWidth)

    useEffect(() => {
        let raf = 0
        const onResize = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => setWinWidth(window.innerWidth))
        }
        window.addEventListener("resize", onResize)
        return () => {
            window.removeEventListener("resize", onResize)
            cancelAnimationFrame(raf)
        }
    }, [])

    const fontSize = clamp(11 + ((winWidth - 600) / 800) * 3, 11, 14)
    return {
        fontSize,
        rowHeight: Math.round(fontSize + 14),
        indent: Math.round(clamp(fontSize * 2, 20, 26)),
        chevron: Math.round(fontSize + 2),
        badgeFontSize: Math.max(10, fontSize - 1)
    }
}

function isStringValue(t?: string) {
    return !!t && t.startsWith('"')
}

// 节点文本包含换行符时即为多行节点（如 TextAsset 的完整脚本内容）
const isMultiline = (segments: Segment[]) => segments.some(s => s.t.includes("\n"))

// 按换行符把 segments 拆成多行，空行保留为空数组（渲染时维持行高）
function splitLines(segments: Segment[]): Segment[][] {
    const lines: Segment[][] = [[]]
    for (const seg of segments) {
        const parts = seg.t.split(/\r?\n/)
        for (let i = 0; i < parts.length; i++) {
            if (i > 0) lines.push([])
            if (parts[i]) lines[lines.length - 1].push({ k: seg.k, t: parts[i] })
        }
    }
    return lines
}

function ColoredSegments({ segments }: { segments: Segment[] }) {
    return (
        <>
            {segments.map((seg, i) => {
                switch (seg.k) {
                    case "type-complex":
                    case "type-primitive":
                        return <span key={i} className="text-[#1a7fe6]">{seg.t}</span>
                    case "middle":
                        return <span key={i} className="text-[#9aa0a8]">{seg.t}</span>
                    case "value":
                        return <span key={i} className={isStringValue(seg.t) ? "text-[#6f8f3d]" : "text-[#9aa0a8]"}>{seg.t}</span>
                    case "field":
                        return <span key={i} className="text-[#202124]">{seg.t}</span>
                    default:
                        return <span key={i} className="text-[#202124]">{seg.t}</span>
                }
            })}
        </>
    )
}

const SegmentText = memo(function SegmentText(
    { segments, fontSize, firstLineOnly }: { segments: Segment[], fontSize: number, firstLineOnly?: boolean }
) {
    // 折叠态只取第一行；展开态依赖外层 whitespace-pre-wrap 让字符串中的 \n 自然换行
    const content = firstLineOnly ? (splitLines(segments)[0] ?? []) : segments
    return (
        <span style={{ fontSize }}>
            <ColoredSegments segments={content} />
        </span>
    )
})

interface TreeRowProps {
    row: FlatRow
    expanded: boolean
    selected: boolean
    // 多行文本是否已向下展开显示全部
    full: boolean
    badgeTitle?: string
    metrics: TreeMetrics
    onToggle: (id: number) => void
    onToggleFull: (id: number) => void
    onSelect: (id: number) => void
    style: React.CSSProperties
    dataIndex?: number
    measureRef?: (node: HTMLElement | null) => void
}

const ErrorRow = memo(function ErrorRow(
    { message, metrics, style, dataIndex, measureRef }:
        { message: string, metrics: TreeMetrics, style: React.CSSProperties, dataIndex?: number, measureRef?: (node: HTMLElement | null) => void }
) {
    return (
        <div ref={measureRef} data-index={dataIndex} style={{ ...style, width: "100%", minWidth: 0 }} className="px-2">
            <div
                style={{ height: metrics.rowHeight }}
                className="flex min-w-0 cursor-default items-center gap-2 rounded-lg bg-[#fdecea] pl-2 pr-3 text-[#d93025]"
            >
                <AlertTriangle
                    style={{ width: metrics.chevron, height: metrics.chevron }}
                    className="shrink-0"
                />
                <span style={{ fontSize: metrics.fontSize }} className="block min-w-0 flex-1 truncate">
                    {message}
                </span>
            </div>
        </div>
    )
})

const TreeRow = memo(function TreeRow(
    { row, expanded, selected, full, badgeTitle, metrics, onToggle, onToggleFull, onSelect, style, dataIndex, measureRef }: TreeRowProps
) {
    if (row.kind === "error") {
        return <ErrorRow message={row.message} metrics={metrics} style={style} dataIndex={dataIndex} measureRef={measureRef} />
    }

    const { node, depth } = row
    const isRoot = node.type === "root"
    const hasChildren = node.children.length > 0
    const multiline = isMultiline(node.segments)
    // 展开后文本行高比字号大 4px，上下补白使首行与折叠态居中位置一致
    const lineHeight = metrics.fontSize + 4
    const padY = Math.round((metrics.rowHeight - lineHeight) / 2)

    return (
        <div ref={measureRef} data-index={dataIndex} style={style} className="px-2">
            <div
                onClick={() => onSelect(node.id)}
                style={full
                    ? { minHeight: metrics.rowHeight, paddingTop: padY, paddingBottom: padY }
                    : { height: metrics.rowHeight }}
                className={`flex cursor-default rounded-lg pl-2 pr-3 ${full ? "items-start" : "items-center"} ${selected ? "bg-[#eff0f2]" : "hover:bg-[#f5f6f7]"}`}
            >
                {/* 每级缩进一条垂直引导线，位于父级箭头列的居中位置；展开行靠 self-stretch 拉满高度 */}
                {Array.from({ length: depth }).map((_, i) => (
                    <span key={i} style={{ width: metrics.indent }} className={`relative shrink-0 ${full ? "self-stretch" : "h-full"}`}>
                        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#ebedf0]" />
                    </span>
                ))}
                <span
                    style={{ width: metrics.indent }}
                    className={`flex shrink-0 justify-center ${full ? "self-stretch items-start" : "h-full items-center"}`}
                >
                    {hasChildren && (
                        <ChevronRight
                            onClick={() => onToggle(node.id)}
                            style={{ width: metrics.chevron, height: metrics.chevron, marginTop: full ? 1 : 0 }}
                            className={`shrink-0 cursor-pointer text-[#5f6368] transition-transform ${expanded ? "rotate-90" : ""}`}
                        />
                    )}
                </span>
                {/* 折叠态：pre 保留前导空格，仅渲染首行并横向省略；展开态：pre-wrap 保留全部换行并自动折行，盒子只向下扩展 */}
                <span
                    style={full ? { lineHeight: `${lineHeight}px` } : undefined}
                    className={`min-w-0 flex-1 ${full
                        ? "whitespace-pre-wrap [overflow-wrap:anywhere]"
                        : "overflow-hidden text-ellipsis whitespace-pre"} ${isRoot ? "font-semibold" : ""}`}
                >
                    <SegmentText segments={node.segments} fontSize={metrics.fontSize} firstLineOnly={!full} />
                </span>
                {multiline && (
                    <button
                        type="button"
                        title={full ? "收起为单行" : "展开显示全部内容"}
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleFull(node.id)
                        }}
                        style={{ fontSize: metrics.badgeFontSize, lineHeight: `${lineHeight - 4}px`, marginTop: full ? 2 : 0 }}
                        className="ml-2 py-0.5 flex shrink-0 select-none items-center gap-0.5 whitespace-nowrap rounded-md px-1.5 text-[#5f6368] hover:bg-[#e8eaed] hover:text-[#202124]"
                    >
                        {full
                            ? <ChevronUp style={{ width: metrics.badgeFontSize + 2, height: metrics.badgeFontSize + 2 }} />
                            : <ChevronDown style={{ width: metrics.badgeFontSize + 2, height: metrics.badgeFontSize + 2 }} />}
                        {full ? "收起" : "展示全部"}
                    </button>
                )}
                {isRoot && badgeTitle ? (
                    <span
                        style={{ fontSize: metrics.badgeFontSize, lineHeight: `${metrics.rowHeight - 8}px` }}
                        className="ml-2 max-w-[16rem] truncate rounded-md bg-[#eff0f2] px-2 py-[1px] text-[#5f6368]"
                    >
                        {badgeTitle}
                    </span>
                ) : null}
            </div>
        </div>
    )
})

export default function DataTree({ id, title }: { id?: number, title?: string }) {

    // 默认全部折叠，仅记录用户显式展开的节点
    const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())
    // 多行节点"展示全部"的展开集合：行高动态变化，由虚拟列表实测
    const [fullIds, setFullIds] = useState<ReadonlySet<number>>(new Set())
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const scrollRef = useRef<HTMLElement | null>(null)
    const metrics = useTreeMetrics()

    // children 是就地追加的，订阅 version 才能拿到流式增量
    const version = useViewTreeStore(s => s.version)
    const rootId = useViewTreeStore(s => s.rootId)
    const nodeMap = useViewTreeStore(s => s.nodeMap)
    const error = useViewTreeStore(s => s.error)

    useEffect(() => {
        if (id == null) return
        useViewTreeStore.getState().resetTree()
        setExpanded(new Set())
        setFullIds(new Set())
        setSelectedId(null)
        assetApi.view(id).catch(() => {
            useViewTreeStore.getState().setError("连接失败，无法获取数据")
        })
    }, [id])

    const rows = useMemo<FlatRow[]>(() => {
        const out: FlatRow[] = []
        const root = rootId != null ? nodeMap.get(rootId) : undefined
        if (root) {
            const walk = (node: ViewTreeNode, depth: number) => {
                out.push({ kind: "node", node, depth })
                if (expanded.has(node.id)) {
                    for (const child of node.children) walk(child, depth + 1)
                }
            }
            walk(root, 0)
        }
        // 后端业务错误追加为树的最后一行；树为空时它就是唯一一行，不再显示空白
        if (error) out.push({ kind: "error", message: error, depth: 0 })
        return out
    }, [version, rootId, nodeMap, expanded, error])

    const toggle = useCallback((id: number) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const toggleFull = useCallback((id: number) => {
        setFullIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const select = useCallback((id: number) => setSelectedId(id), [])

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => metrics.rowHeight,
        // 用节点 id 作为测量缓存键：流式插入/折叠导致索引位移时，已测行高不会张冠李戴
        getItemKey: (i) => {
            const r = rows[i]
            return r.kind === "node" ? r.node.id : "__error__"
        },
        overscan: 12,
    })

    const badgeTitle = title && title !== "null" ? title : undefined

    // 已发起请求但 root 未到达且无错误 → 加载中
    const isLoading = id != null && rootId == null && !error

    if (isLoading) {
        return (
            <div className="flex h-full w-full min-w-0 items-center justify-center gap-2 text-[#9aa0a8]">
                <Loader2
                    style={{ width: metrics.chevron + 4, height: metrics.chevron + 4 }}
                    className="animate-spin"
                />
                <span style={{ fontSize: metrics.fontSize }}>加载中...</span>
            </div>
        )
    }

    return (
        <div className="h-full w-full min-w-0 bg-white py-2">
            <SimpleBar className="h-full w-full">
                {({ scrollableNodeProps, contentNodeProps }) => (
                    <div
                        {...scrollableNodeProps}
                        ref={(el) => {
                            scrollRef.current = el
                            scrollableNodeProps.ref.current = el ?? undefined
                        }}
                    >
                        <div
                            {...contentNodeProps}
                            ref={(el) => {
                                contentNodeProps.ref.current = el ?? undefined
                            }}
                        >
                            <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                                {virtualizer.getVirtualItems().map((vi) => {
                                    const row = rows[vi.index]
                                    const rowKey = row.kind === "node" ? row.node.id : "__error__"
                                    return (
                                        <TreeRow
                                            key={rowKey}
                                            row={row}
                                            expanded={row.kind === "node" && expanded.has(row.node.id)}
                                            selected={row.kind === "node" && selectedId === row.node.id}
                                            full={row.kind === "node" && fullIds.has(row.node.id)}
                                            badgeTitle={badgeTitle}
                                            metrics={metrics}
                                            onToggle={toggle}
                                            onToggleFull={toggleFull}
                                            onSelect={select}
                                            dataIndex={vi.index}
                                            measureRef={virtualizer.measureElement}
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                width: "100%",
                                                // 不固定高度：measureElement 实测内容高度，展开多行时行高自动增长
                                                transform: `translateY(${vi.start}px)`,
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </SimpleBar>
        </div>
    )
}
