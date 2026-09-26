import { createStore } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type InitStoreState = { isInit: boolean,isEditorInit:boolean }

type InitStoreActions = {
    setIsInit: (val: InitStoreState['isInit']) => void
    setIsEditorInit: (val: InitStoreState['isEditorInit']) => void
}

type InitStore = InitStoreState & InitStoreActions

export const useInitStore = createStore<InitStore>()(
    persist(
        (set) => ({
            isInit: false,
            isEditorInit: false,
            setIsInit: (val) => set({ isInit: val }),
            setIsEditorInit: (val) => set({isEditorInit: val})
        }),
        {
            name: 'init-storage',
            storage: createJSONStorage(() => sessionStorage)
        },
    ),
)