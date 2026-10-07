import GameInfoItem from "@/components/GameInfoItem";
import ProjectInfo from "@/model/ProjectInfo";
import { VndbBody, VndbRes } from "@/model/Vndb";
import { manager } from "@/utils/DbManager";
import { useInitStore } from "@/utils/useInitStore";
import { assetApi } from "@/utils/AssetApi";
import { useEffect, useState } from "react";
import { PiPlayFill } from "react-icons/pi";
import { invoke } from "@tauri-apps/api/core";

export default function GamesView({ id, dbPath }: { id: number | null, dbPath: string }) {

    const [gameInfo, setGameInfo] = useState<ProjectInfo | null>(null);

    const handleLaunch = async () => {
        if (!gameInfo?.file_path) return;
        try {
            await invoke("run_application", { filePath: gameInfo.file_path });
        } catch (e) {
            console.error("启动游戏失败:", e);
        }
    }

    useEffect(() => {
        let isInit = useInitStore.getState().isInit
        const getInfo = async (id: number) => {
            const info = await manager.selectProjectInfo(id)
            if (!info) return
            console.log(`status: ${info.status}`)
            if (info.status == 0) {
                const vndb_body: VndbBody = {
                    filters: ["and", ["search", "=", info?.title], ["or", ["lang", "=", "zh"], ["lang", "=", "ja"]]],
                    fields: "title, image.url, description, rating, tags.id, tags.name, tags.category, tags.vn_count, tags.description, developers.name"
                };
                const response = await fetch("https://api.vndb.org/kana/vn", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(vndb_body)
                });
                const res: VndbRes = await response.json() as VndbRes;
                await manager.completeProjctInfo(id, dbPath, res);
                if (!isInit) {
                    await assetApi.init({ Path: info?.root_path, DbPath: dbPath, Title: info?.title });
                    useInitStore.getState().setIsInit(true)
                }
                const newInfo = await manager.selectProjectInfo(id)
                setGameInfo(newInfo);
                if (res.results[0].tags) {
                    await manager.insertTag(id,res.results[0].tags)
                }
            } else {
                if (!isInit) {
                    await assetApi.init({ Path: info?.root_path, DbPath: dbPath, Title: info?.title });
                    useInitStore.getState().setIsInit(true)
                }
                setGameInfo(info);
            }
        }
        if (!id) return
        getInfo(id).catch(e => console.error("getInfo error:", e));

    }, [id, dbPath])

    return (
        <div className="px-6 py-4 w-full h-full flex items-center justify-center">
            <div className="w-full px-4 h-full bg-white gap-4 rounded-sm flex items-center justify-center shadow-lg">
                <div className="aspect-[9/16] h-[80%] flex-shrink-0 flex justify-center items-center">
                    {gameInfo?.cover_path ? (
                        <img
                            src={gameInfo.cover_path}
                            alt=""
                            className="object-cover rounded-md shadow-lg"
                        />
                    ) : (
                        <div className="w-full h-full cursor-pointer flex items-center justify-center bg-gray-300 rounded-md shadow-lg hover:bg-gray-300/70">
                            <p className="text-gray-500">没有封面</p>
                        </div>
                    )}
                </div>
                <div className="flex flex-grow min-h-[80%] flex-col gap-4 truncate">
                    <span className="text-2xl font-semibold shrink-0 ">{gameInfo?.title}</span>
                    <div className="flex flex-grow flex-col gap-4">
                        <div className="flex max-w-60 justify-between gap-4">
                            <GameInfoItem title="开发" data={gameInfo?.manufactor ?? "-"} className="truncate" />
                            <GameInfoItem title="评分" data={gameInfo?.rating ?? "-"} className="truncate" />
                            <GameInfoItem title="添加时间" data={gameInfo?.create_time.split(" ")[0]} className="truncate" />
                        </div>
                        <GameInfoItem title="简介" data={gameInfo?.description ?? "暂无简介"} className="whitespace-pre-line line-clamp-7" />

                    </div>
                    <div className="shrink-0 shadow-lg">
                        <button
                            onClick={handleLaunch}
                            disabled={!gameInfo?.file_path}
                            className="w-20 h-8 gap-1 flex items-center justify-center cursor-pointer text-semibold rounded-sm text-white text-xs bg-[#0067c0] hover:bg-[#0067c0]/70 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
                        >
                            <PiPlayFill />
                            <span>启动</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}