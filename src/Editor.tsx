'use client'

import { useEffect, useRef, useState } from "react";
import "./Editor.css";
import SideBar from "./components/SideBar";
import TitleBar from "./components/TitleBar";
import AboutView from "./pages/AboutView";
import ExtractView from "./pages/ExtractView";
import FontView from "./pages/FontView";
import GamesView from "./pages/GamesView";
import SettingsView from "./pages/SettingsView";
import TranslateView from "./pages/TranslateView";
import { useTabStore } from "./utils/useTabStore";
import { gm } from "./utils/GameDbManager";
import { listen } from '@tauri-apps/api/event';
import { useAssetObjectStore } from "./model/AssetObjectInfo";

function Editor() {

  const { currentTab, setCurrentTab } = useTabStore();
  const [id, setId] = useState<number | null>(null);
  const [dbPath, setDbPath] = useState("");
  const idRef = useRef<number | null>(null);
  const [title, setTitle] = useState("");

  type setModInfo = {
    id: number
  }

  useEffect(() => {
    const initGame = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = Number(params.get("id"));
      const title = String(params.get("title"));
      if (!id) return;
      idRef.current = id;
      const path = await gm.init(id);
      setDbPath(path);
      setId(id);
      setTitle(title);

      listen<setModInfo>('setMod', (event) => {
        console.log(`触发setMod, ${event.payload.id}`)
        useAssetObjectStore.getState().setModInfo(event.payload.id)
      })
    }
    initGame();
  }, [])

  return (
    <div className="relative w-full h-full">
      <TitleBar className="pl-[44px] pr-4" title="SoraTrans" />
      <SideBar setCurrentTab={setCurrentTab} />
      <main className="absolute top-[40px] left-[40px] right-0 bottom-0">
        {currentTab === 1 && <GamesView id={id} dbPath={dbPath} />}
        {currentTab === 2 && <ExtractView title={title} />}
        {currentTab === 3 && <TranslateView />}
        {currentTab === 4 && <FontView />}
        {currentTab === 5 && <AboutView />}
        {currentTab === 6 && <SettingsView />}
      </main>
    </div>
  );
}

export default Editor;
