import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProjectInfoStore } from "@/model/ProjectInfo"
import { manager } from "@/utils/DbManager"
import { useState } from "react"
import { VscRename } from "react-icons/vsc"

export function RenameDialog({ isDisabled, id }: { isDisabled: boolean, id: number }) {
    const [titleVal, setTitleVal] = useState<string>("")
    const [pathVal, setPathVal] = useState<string>("")


    const handleOpenDialogBtn = async () => {
        const list = useProjectInfoStore.getState().infoList
        const info = list.find((val)=>val.id == id)
        if (!info) return;
        setTitleVal(info.title)
        setPathVal(info.root_path)
    }

    const handleRenameBtn = async () => {
        await manager.renameProjectInfo(id, titleVal)
        useProjectInfoStore.getState().updateName(id,titleVal)
    }

    return (
        <Dialog>
            <form>
                <DialogTrigger asChild>
                    <button disabled={isDisabled} onClick={handleOpenDialogBtn} className='flex relative w-full items-center justify-center cursor-pointer rounded-sm border border-gray-400 px-4 py-1 text-xs hover:bg-gray-200 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none disabled:cursor-default'>
                        <VscRename className="absolute left-2" />
                        <span className='pl-1 whitespace-nowrap'>重命名</span>
                    </button>
                </DialogTrigger>
                <DialogContent className="w-3/5 max-w-[calc(100%-2rem)] sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>重命名项目</DialogTitle>
                    </DialogHeader>
                    <FieldGroup>
                        <Field>
                            <Label htmlFor="name-1">项目名称:</Label>
                            <Input id="name-1" disabled={false} value={titleVal} onChange={e => { setTitleVal(e.target.value) }} />
                        </Field>
                        <Field>
                            <Label htmlFor="username-1">项目路径:</Label>
                            <Input id="username-1" disabled={true} value={pathVal} />
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="submit" onClick={handleRenameBtn} className="w-18 h-7 text-xs rounded-sm">重命名</Button>
                        </DialogClose>
                        <DialogClose asChild>
                            <Button variant="outline" className="w-18 h-7 text-xs rounded-sm">取消</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    )
}
