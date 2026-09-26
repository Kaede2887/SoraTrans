import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { DataTable, type DataTableHandle } from "./ui/data-table"
import { columns } from "./ui/column"
import { useScanInfoStore, type ScanInfo } from "@/model/ScanInfo"
import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "./ui/button"
import { error } from "@tauri-apps/plugin-log"
import { invoke } from "@tauri-apps/api/core"
import { open } from '@tauri-apps/plugin-dialog';
import { manager } from "@/utils/DbManager"

export function ScanDialog({ data }: { data: ScanInfo[] | null }) {

    const tableRef = useRef<DataTableHandle>(null)
    const [selectNum, setSelectNum] = useState(0)

    const openDialog = useScanInfoStore((state)=>state.openScanDialog)

    const setOpen = useScanInfoStore((state)=>state.setOpenScanDialog)

    const handleScanBtn = async () => {
        try {
            useScanInfoStore.getState().setList(null)
            const dir = await open({
                multiple: false,
                directory: true,
            })
            if (!dir) return;
            useScanInfoStore.getState().setOpenScanDialog(true)
            invoke("scan_info",{dir:dir}).then((val)=>{
                const info: ScanInfo[] = val as ScanInfo[];
                useScanInfoStore.getState().setList(info)
            })
        } catch (e) {
            error(`扫描项目失败:${e}`)
        }
    }

    const handleScanImport = () => {
        const selected = tableRef.current?.getSelectedRows() ?? []
        if (selected.length === 0) return
        manager.insertBatchProjectInfo(selected)
    }

    return (
        <Dialog open={openDialog} onOpenChange={setOpen}>
            <form>
                <DialogContent className="h-3/5 w-4/5 flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="select-none">扫描导入项目</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 flex min-h-0 min-w-0">
                        {
                            data ? (
                                <DataTable
                                    columns={columns}
                                    data={data}
                                    tableRef={tableRef}
                                    onSelectionChange={setSelectNum}
                                />
                            ) : (
                                <div className="flex flex-col flex-1 gap-2 items-center justify-center">
                                    <motion.div
                                        className="w-12 h-12 rounded-full border-4 border-t-blue-400"
                                        animate={{ transform: "rotate(360deg)" }}
                                        transition={{
                                            duration: 1.5,
                                            repeat: Infinity,
                                            ease: "linear",
                                        }}
                                    />
                                    <p className="text-xs text-gray-400">扫描中...</p>
                                </div>
                            )
                        }
                    </div>
                    {data && (
                        <DialogFooter className="items-center justify-between px-4 h-6 shrink-0">
                            <DialogClose>
                                <Button variant="outline" onClick={handleScanBtn} className="rounded-sm text-xs text-gray-500">重新选择目录</Button>
                            </DialogClose>
                            <DialogClose>
                                <Button onClick={handleScanImport} className="text-xs rounded-sm">导入游戏{selectNum > 0 ? ` ( ${selectNum} )` : ""}</Button>
                            </DialogClose>
                        </DialogFooter>
                    )}

                </DialogContent>
            </form>
        </Dialog>
    )
}