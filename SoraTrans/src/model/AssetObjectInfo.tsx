import { AssetObjSortMethod } from "@/utils/GameDbManager";
import { create } from "zustand";

export default interface AssetObjectInfo {
    id: number,
    name: string,
    type: string,
    path_id: number,
    size: number,
    line_count: number,
    isMod: boolean
}

interface AssetObjectState {
    id: number;
    assetId: number;
    assetName: string;
    assetObjList: AssetObjectInfo[];
    currentSort: AssetObjSortMethod | null;
    selectAssetObj: AssetObjectInfo | null;
    modifiedIds: Set<number>;
    typeFilter: Set<string>;
    setId: (val: number) => void;
    setAssetId: (val: number) => void;
    setAssetName: (val: string) => void;
    setAssetObjList: (val: AssetObjectInfo[]) => void;
    setCurrentSort: (val: AssetObjSortMethod) => void;
    setSelectAssetObj: (val: AssetObjectInfo) => void;
    setModInfo: (val: number) => void;
    setTypeFilter: (val: Set<string>) => void;
    sortListByMod: () => void;
}

export const useAssetObjectStore = create<AssetObjectState>((set) => ({
    id: 0,
    assetId: 0,
    assetName: "",
    assetObjList: [],
    currentSort: null,
    selectAssetObj: null,
    modifiedIds: new Set<number>(),
    typeFilter: new Set<string>(),
    setId: (val) => set({ id: val }),
    setAssetId: (val) => set({ assetId: val }),
    setAssetName: (val) => set({ assetName: val }),
    setAssetObjList: (val) =>
        set((state) => ({
            assetObjList: val.map((item) =>
                state.modifiedIds.has(item.id)
                    ? { ...item, isMod: true }
                    : { ...item, isMod: false }
            ),
        })),
    setCurrentSort: (val) => set({ currentSort: val }),
    setTypeFilter: (val) => set({ typeFilter: val }),
    setSelectAssetObj: (val) => set({ selectAssetObj: val }),
    setModInfo: (val) =>
        set((state) => {
            const modifiedIds = new Set(state.modifiedIds);
            modifiedIds.add(val);

            const assetObjList = state.assetObjList.map((item) =>
                item.id === val
                    ? { ...item, isMod: true }
                    : item
            );

            return {
                modifiedIds,
                assetObjList,
            };
        }),
    sortListByMod: () => set((state) => {
        const list = [...state.assetObjList].sort(
            (a, b) => Number(b.isMod) - Number(a.isMod)
        );

        return {
            assetObjList: list
        };
    })
}));