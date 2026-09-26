import { TextOriginSortMethod } from "@/utils/GameDbManager"
import { create } from "zustand"

export interface TextOrigin {
    id: number,
    origin_text: string,
    trans_text: string
}

interface TextOriginState {
    list: TextOrigin[],
    title: string,
    initTitle: string,
    isBackShow: boolean,
    currentPatternId: number,
    selectTextItem: TextOrigin | null,
    currentSort: TextOriginSortMethod | null,
    setList: (list: TextOrigin[]) => void,
    setTitle: (val: string) => void,
    setInitTitle: (val: string) => void,
    setIsBackShow: (val: boolean) => void,
    setCurrentPatternId: (val: number) => void,
    setCurrentSort: (val: TextOriginSortMethod) => void,
    setSelectTextItem: (val: TextOrigin) => void,
    updateListItem: (val: TextOrigin) => void,
    updateList: (val: TextOrigin[]) => void,
    resetTitle: () => void
}

export const useTextOriginStore = create<TextOriginState>((set, get) => ({
    list: [],
    title: "",
    initTitle: "",
    isBackShow: false,
    currentSort: null,
    currentPatternId: 0,
    selectTextItem: null,
    setList: (val) => set({ list: val }),
    setTitle: (val) => set({ title: val }),
    setInitTitle: (val) => set({ initTitle: val }),
    setIsBackShow: (val) => set({ isBackShow: val }),
    setCurrentSort: (val) => set({ currentSort: val }),
    setCurrentPatternId: (val) => set({ currentPatternId: val }),
    setSelectTextItem: (val) => set({ selectTextItem: val }),
    updateListItem: (val) => set((state) => ({
        list: state.list.map((item) =>
            item.id === val.id
                ? { ...item, trans_text: val.trans_text }
                : item
        )
    })),
    updateList: (val) => set((state) => {
        if (val.length === 0) return state;

        const updateMap = new Map(
            val.map(i => [i.origin_text, i.trans_text])
        );

        return {
            list: state.list.map(item => {
                const trans_text = updateMap.get(item.origin_text);

                return trans_text !== undefined
                    ? { ...item, trans_text }
                    : item;
            })
        };
    }),
    resetTitle: () => set({ title: get().initTitle })
}))