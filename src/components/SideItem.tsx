import { motion } from "framer-motion";
import { IconType } from "react-icons";

interface SideItemType {
    ItemIcon: IconType;
    onClick: (id?: number) => void;
    ItemName?: string;
    id: number
}

function SideItem({ ItemIcon, onClick, ItemName, isSideOpen, id, currentId }:
    {
        ItemIcon: IconType, isSideOpen: boolean
        onClick: (id?: number) => void, ItemName?: string, id: number, currentId: number
    }) {

    const ItemStyle = `flex items-center rounded-sm hover:bg-gray-200 ${(!isSideOpen && id != 0) && "w-full justify-start"}`

    const ItemActiveStyle = `flex bg-gray-200 hover:bg-gray-200/80 rounded-sm items-center ${!isSideOpen && "w-full justify-start"}`

    const TextStyle = `text-xs select-none whitespace-nowrap overflow-hidden transition-all duration-300 ${isSideOpen ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`

    const isActive = currentId == id;

    return (
        // 1. 必须加上 relative，作为 absolute 指示条的绝对定位基准
        <div
            className="relative h-[30px] px-[5px] bg-transparent flex items-center cursor-pointer select-none"
            onClick={() => onClick(id)}
        >
            {/* 🌟 2. 蓝色移动指示条：仅在选中时渲染，利用 layoutId 自动播放平滑滑动动画 */}
            {isActive && (
                <motion.div
                    layoutId="active-bar"
                    className="absolute left-[5px] h-[16px] w-[3px] bg-[#0067c0] rounded-full z-20"
                    transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                    }}
                />
            )}

            {/* 3. 你原本的内部样式逻辑 */}
            <div className={isActive ? ItemActiveStyle : ItemStyle}>
                <div className="h-[30px] w-[30px] bg-clip-content flex items-center justify-center shrink-0">
                    <ItemIcon size={18} />
                </div>
                {!isSideOpen && <span className={TextStyle}>{ItemName}</span>}
            </div>
        </div>
    )
}

export { SideItem };
export type { SideItemType };
