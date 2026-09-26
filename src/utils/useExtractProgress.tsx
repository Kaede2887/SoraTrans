import { create } from "zustand"

export interface ExtractProgressTable{
    val: number
    scanned: number
    total: number
    elapsed: number
    remaining: number
    totalResult: number
    title: string
    isFirstScan: boolean
    setVal: (val:number) => void
    setScanned: (scanned: number) => void
    setTotal: (total: number) => void
    setElapsed: (elapsed: number) => void
    setRemaining: (remaining: number) => void
    setTotalResult: (totalResult: number) => void
    setTitle: (title: string) => void
    setIsFirstScan: (isFirstScan: boolean) => void
    updateProgress: (data: { val: number; scanned: number; total: number; elapsed: number; remaining: number; totalResult: number }) => void
}

export const useExtractProgressTable = create<ExtractProgressTable>((set)=>({
    val: 0,
    scanned: 0,
    total: 0,
    elapsed: 0,
    remaining: 0,
    totalResult: 0,
    title: "无任务",
    isFirstScan: false,
    setVal: (val) => set({val: val}),
    setScanned: (scanned) => set({scanned: scanned}),
    setTotal: (total) => set({total: total}),
    setElapsed: (elapsed) => set({elapsed: elapsed}),
    setRemaining: (remaining) => set({remaining: remaining}),
    setTotalResult: (totalResult) => set({totalResult: totalResult}),
    setTitle: (title) => set({title:title}),
    setIsFirstScan: (isFirstScan) => set({isFirstScan: isFirstScan}),
    updateProgress: (data) => set({
        val: data.val,
        scanned: data.scanned,
        total: data.total,
        elapsed: data.elapsed,
        remaining: data.remaining,
        totalResult: data.totalResult
    })
}))