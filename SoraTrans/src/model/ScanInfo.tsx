import { create } from "zustand"

export type ScanInfo = {
    id: number
    title: string
    exe: ExeInfo[]
}

export type ExeInfo = {
    name: string
    path: string
}

interface ScanInfoState {
  list: ScanInfo[] | null;
  openScanDialog: boolean;
  setList: (val: ScanInfo[] | null) => void
  setOpenScanDialog: (val:boolean) => void
}

export const useScanInfoStore = create<ScanInfoState>((set) => ({
    list: null,
    openScanDialog: false,
    setList: (val) => set({list:val}),
    setOpenScanDialog: (val) => set({openScanDialog: val})
}));