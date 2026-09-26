import { MdMenu, MdTranslate } from "react-icons/md";
import { SideItem, SideItemType } from "./SideItem";
import { useState } from "react";
import { motion } from "framer-motion";
import { LuGamepad2, LuInfo, LuSettings, LuType } from "react-icons/lu";
import { TbTextRecognition } from "react-icons/tb";

export default function SideBar(setCurrentTab:{setCurrentTab:(tabId: number) => void}) {
    const [isSideOpen, setIsSideOpen] = useState(true);
    const [currentId, setCurrentId] = useState(1);
    

    const MenuBtn = () => {
        setIsSideOpen(!isSideOpen);
    }

    const PageSwitchBtn = (id?: number) => {
        if (!id) return;
        setCurrentId(id)
        setCurrentTab.setCurrentTab(id)
    }

    const ItemTopList: SideItemType[] = [
        { ItemIcon: MdMenu, onClick: MenuBtn, id: 0 },
        { ItemIcon: LuGamepad2, onClick: PageSwitchBtn, ItemName: "游戏项目", id: 1 },
        { ItemIcon: TbTextRecognition, onClick: PageSwitchBtn, ItemName: "文本提取", id: 2 },
        { ItemIcon: MdTranslate, onClick: PageSwitchBtn, ItemName: "翻译", id: 3 },
        // { ItemIcon: LuType, onClick: PageSwitchBtn, ItemName: "字体制作", id: 4 },
    ];

    const ItemBottomList: SideItemType[] = [
        // { ItemIcon: LuInfo, onClick: PageSwitchBtn, ItemName: "关于", id: 5 },
        // { ItemIcon: LuSettings, onClick: PageSwitchBtn, ItemName: "设置", id: 6 },
    ]

    return (
        <motion.aside
            // 1. 严格使用 40px 宽度
            animate={isSideOpen ? { width: 40 } : { width: 190 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}

            // 2. 将内边距调小为 px-1（左右各 4px），给图标留足 32px 空间；加上 items-center 确保图标完美居中
            className="h-screen absolute left-0 top-0 pt-[5px] pb-[5px] bg-[#f0f3f9] 
             flex flex-col justify-between items-center
             border-r border-gray-200 z-40 overflow-hidden select-none"
        >
            {/* 上方 5 个选项容器 */}
            <div className="flex flex-col space-y-1 w-full">
                {ItemTopList.map((item, index) => (
                    <SideItem
                        key={item.id || index}
                        ItemIcon={item.ItemIcon}
                        onClick={item.onClick}
                        ItemName={item.ItemName}
                        isSideOpen={isSideOpen}
                        id={item.id}
                        currentId={currentId}
                    />
                ))}
            </div>

            {/* 下方 2 个选项容器：通过 mt-auto 贴底 */}
            <div className="flex flex-col space-y-1 w-full mt-auto pt-2 border-t border-gray-200/60">
                {ItemBottomList.map((item, index) => (
                    <SideItem
                        key={item.id || index}
                        ItemIcon={item.ItemIcon}
                        onClick={item.onClick}
                        ItemName={item.ItemName}
                        isSideOpen={isSideOpen}
                        id={item.id}
                        currentId={currentId}
                    />
                ))}
            </div>
        </motion.aside>
    )
}