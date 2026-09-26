"use client"

import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { features, type DataTableFeatures } from "./data-table-features"
import React, { useEffect } from "react"
import type { ScanInfo } from "@/model/ScanInfo"

export interface DataTableHandle {
    getSelectedRows: () => ScanInfo[]
}

interface DataTableProps<TData extends RowData> {
    columns: ColumnDef<DataTableFeatures, TData>[]
    data: TData[],
    tableRef?: React.MutableRefObject<DataTableHandle | null>,
    onSelectionChange?: (count: number) => void,
}

function DataTableInner<TData extends RowData>({
    columns,
    data,
    tableRef,
    onSelectionChange,
}: DataTableProps<TData>) {

    const [rowSelection, setRowSelection] = React.useState({})
    const [editingRowId, setEditingRowId] = React.useState<string | null>(null)
    const [editedTitles, setEditedTitles] = React.useState<Record<string, string>>({})
    const [selectedExes, setSelectedExes] = React.useState<Record<string, string>>({})

    const setEditedTitle = React.useCallback((id: string, val: string) => {
        setEditedTitles(prev => ({ ...prev, [id]: val }))
    }, [])

    const setSelectedExe = React.useCallback((id: string, val: string) => {
        setSelectedExes(prev => ({ ...prev, [id]: val }))
    }, [])

    const table = useTable({
        features,
        data,
        columns,
        onRowSelectionChange: setRowSelection,
        state:{
            rowSelection,
        },
        meta: { editingRowId, setEditingRowId, editedTitles, setEditedTitle, selectedExes, setSelectedExe },
    })

    const num = table.getFilteredSelectedRowModel().rows.length

    useEffect(() => {
        onSelectionChange?.(num)
    }, [num, onSelectionChange])

    React.useImperativeHandle(tableRef, () => ({
        getSelectedRows: () => table.getFilteredSelectedRowModel().rows.map(r => {
            const original = r.original as ScanInfo
            const editedTitle = editedTitles[r.id]
            const selectedExeName = selectedExes[r.id]
            let exe = original.exe
            if (selectedExeName) {
                const found = original.exe.find(e => e.name === selectedExeName)
                if (found) exe = [found]
            }
            return {
                ...original,
                title: editedTitle !== undefined ? editedTitle : original.title,
                exe,
            }
        })
    }), [table, editedTitles, selectedExes])

    return (
        <div className="rounded-md border flex-grow overflow-auto scrollbar-none min-h-0 min-w-0">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id} className="sticky top-0 z-10 bg-background">
                                        {header.isPlaceholder ? null : (
                                            <table.FlexRender header={header} />
                                        )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                className="overflow-hidden"
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        <table.FlexRender cell={cell} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export const DataTable = React.memo(DataTableInner) as <TData extends RowData>(
    props: DataTableProps<TData>
) => React.ReactElement