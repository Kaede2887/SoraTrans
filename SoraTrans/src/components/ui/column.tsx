"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { type DataTableFeatures } from "./data-table-features"
import { type ScanInfo } from "@/model/ScanInfo"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { MdEdit, MdOutlineFolderOpen } from "react-icons/md"
import { invoke } from "@tauri-apps/api/core"
import { LuCheck } from "react-icons/lu"


const columnHelper = createColumnHelper<DataTableFeatures, ScanInfo>()



export const columns = columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor("title", {
    header: "项目名称",
    cell: (prop) => {
      const meta = prop.table.options.meta as {
        editingRowId: string | null
        setEditingRowId: (id: string | null) => void
        editedTitles: Record<string, string>
        setEditedTitle: (id: string, val: string) => void
      } | undefined
      const isEditing = meta?.editingRowId === prop.row.id
      const initialVal = meta?.editedTitles?.[prop.row.id] ?? prop.getValue()

      return (
        <div className={`${isEditing ? "border-b-1 border-black" : "border-b-1 border-transparent"}`}>
          <input
            key={`title-${prop.row.id}-${isEditing}`}
            defaultValue={initialVal}
            readOnly={!isEditing}
            autoFocus={isEditing}
            onBlur={(e) => {
              if (!isEditing) return
              meta?.setEditedTitle(prop.row.id, e.currentTarget.value)
              meta?.setEditingRowId(null)
            }}
            className={`block max-w-28 w-full truncate align-middle focus:outline-0 `}
          />
        </div>
      )
    },
  }),
  columnHelper.accessor("exe", {
    id: "exe",
    header: "启动程序",
    cell: (prop) => {
      const meta = prop.table.options.meta as {
        selectedExes: Record<string, string>
        setSelectedExe: (id: string, val: string) => void
      } | undefined
      const exeList = prop.getValue()
      const currentName = meta?.selectedExes?.[prop.row.id] ?? exeList[0].name
      return (
        <Select value={currentName} onValueChange={(v) => meta?.setSelectedExe(prop.row.id, v)}>
          <SelectTrigger className="w-full max-w-42 text-xs border-gray-400 truncate">
            <span className="max-w-32 truncate">
              <SelectValue />
            </span>
          </SelectTrigger>

          <SelectContent position="popper" className=" text-xs items-center justify-center">
            {
              exeList.map((val) => {
                return (
                  <SelectItem value={val.name} className="h-7  px-2 py-0 text-xs ">
                    <span className="max-w-36 w-full truncate">{val.name}</span>
                  </SelectItem>
                )
              })
            }
          </SelectContent>
        </Select>
      )
    }
  }),
  columnHelper.display({
    id: "action",
    header: "操作",
    cell: ({ row, table }) => {
      const path = row.original.exe[0].path;
      const meta = table.options.meta as {
        editingRowId: string | null
        setEditingRowId: (id: string | null) => void
      } | undefined
      const isEditing = meta?.editingRowId === row.id

      const handleOpenFolder = (ExePath: string) => {
        invoke("open_folder", { path: ExePath });
      }

      const handleEdit = () => {
        meta?.setEditingRowId(row.id)
      }

      const handleCheck = () => {
        meta?.setEditingRowId(null)
      }

      return (
        <div className="flex items-center justify-between w-12" >
          <MdOutlineFolderOpen onClick={() => handleOpenFolder(path)} className="w-5 h-5 cursor-pointer" />
          {
            isEditing ? (
              <LuCheck onClick={handleCheck} className="w-5 h-5 cursor-pointer" />
            ) : (
              <MdEdit onClick={handleEdit} className="w-4 h-4 cursor-pointer" />
            )
          }

        </div >
      )
    }
  })
])