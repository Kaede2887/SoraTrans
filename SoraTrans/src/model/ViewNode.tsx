import { create } from "zustand";

export interface Segment {
    k: string,
    t: string
}

// view_node SSE 事件的扁平节点：root 的 parentId 为 null，
// 其余节点通过 parentId 引用先到达的父节点（事件按深度优先顺序下发）。
export interface ViewNode {
    type: "root" | "node" | string,
    id: number,
    parentId: number | null,
    segments: Segment[]
}

// 组装后的树节点，children 引用同一个 Map 中的节点对象
export interface ViewTreeNode extends ViewNode {
    children: ViewTreeNode[]
}

// 父节点尚未到达的节点 id，父节点出现后再尝试挂载
const orphanIds = new Set<number>();

interface ViewTreeState {
    rootId: number | null,
    nodeMap: Map<number, ViewTreeNode>,
    // 节点通过 children 引用就地追加，version 自增通知消费端重新读取
    version: number,
    // 后端通过 event:error 下发的业务错误信息（如空引用异常），null 表示无错误
    error: string | null,
    addNodes: (nodes: ViewNode[]) => void,
    setError: (message: string | null) => void,
    resetTree: () => void
}

export const useViewTreeStore = create<ViewTreeState>((set, get) => ({
    rootId: null,
    nodeMap: new Map(),
    version: 0,
    error: null,
    addNodes: (nodes) => {
        if (nodes.length === 0) return;

        let { rootId, nodeMap } = get();
        let errorCleared = false;

        for (const node of nodes) {
            // 新一轮 view 流从 root 开始，丢弃上一次的树和错误
            if (node.type === "root") {
                nodeMap = new Map();
                orphanIds.clear();
                rootId = node.id;
                errorCleared = true;
                nodeMap.set(node.id, { ...node, segments: node.segments ?? [], children: [] });
                continue;
            }

            if (node.type !== "node") continue;

            // 重复 id 不重建节点，避免丢掉已挂载的 children
            let treeNode = nodeMap.get(node.id);
            if (!treeNode) {
                treeNode = { ...node, segments: node.segments ?? [], children: [] };
                nodeMap.set(node.id, treeNode);
            }

            if (node.parentId == null) {
                if (rootId === null) rootId = node.id;
                continue;
            }

            const parent = nodeMap.get(node.parentId);
            if (parent) {
                if (!parent.children.includes(treeNode)) parent.children.push(treeNode);
            } else {
                orphanIds.add(node.id);
            }
        }

        // 兼容节点乱序到达：本轮有新父节点到达时，挂起的孤儿可能可以挂载了
        if (orphanIds.size > 0) {
            for (const id of orphanIds) {
                const treeNode = nodeMap.get(id);
                if (!treeNode || treeNode.parentId == null) {
                    orphanIds.delete(id);
                    continue;
                }
                const parent = nodeMap.get(treeNode.parentId);
                if (parent) {
                    if (!parent.children.includes(treeNode)) parent.children.push(treeNode);
                    orphanIds.delete(id);
                }
            }
        }

        set({
            rootId, nodeMap,
            ...(errorCleared ? { error: null } : {}),
            version: get().version + 1
        });
    },
    setError: (message) => set({ error: message, version: get().version + 1 }),
    resetTree: () => {
        orphanIds.clear();
        set({ rootId: null, nodeMap: new Map(), error: null, version: get().version + 1 });
    }
}));
