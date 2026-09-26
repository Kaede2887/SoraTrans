import { create } from 'zustand';

interface TabState {
  currentTab: number;
  setCurrentTab: (tabId: number) => void;
}

export const useTabStore = create<TabState>((set) => ({
  currentTab: 1, 
  setCurrentTab: (tabId) => set({ currentTab: tabId }),
}));