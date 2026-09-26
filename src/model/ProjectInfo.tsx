import { create } from "zustand";

export default interface ProjectInfo{
    id: number,
    title: string,
    root_path:string,
    icon_path:string,
    file_path:string,
    db_path?: string,
    cover_path?:string,
    rating?: number,
    description?: string,
    manufactor?:string,
    tags?:string[],
    status: number,
    create_time:string,
    update_time:string,
}

export enum SortMode {
    Time = "update_time DESC",
    Name = "title ASC"
}

interface ProjectInfoState {
  infoList: ProjectInfo[];
  current: number | null;
  currentSortMode: SortMode;
  setCurrent: (val: number) => void;
  setCurrentSortMode: (val: SortMode) => void;
  setInfoList: (val:ProjectInfo[]) => void;
  deleteSelectById: (val: number) => void;
  updateName: (id: number,val: string) => void;
}

export const useProjectInfoStore = create<ProjectInfoState>((set) => ({
    infoList: [],
    current: null,
    currentSortMode: SortMode.Time,
    setCurrent: (val) => set({current:val}),
    setCurrentSortMode: (val) => set({currentSortMode: val}),
    setInfoList: (val) => set({infoList:val}),
    deleteSelectById: (val) => set((state)=>{
        const newList = state.infoList.filter(x => x.id != val)
        return {
            infoList: newList,
            current: null 
        };
    }),
    updateName: (id,val) => set((state)=>{
        const newList = state.infoList.map((item)=>
            item.id == id ? {...item , title: val} : item
        )
        return {
            infoList: newList
        }
    })
}));