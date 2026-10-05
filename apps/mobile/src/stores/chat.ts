import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { EditableEntry } from "../components/EditEntryModal";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatState = {
  messages: ChatMessage[];
  pending: EditableEntry | null;
  addMessage: (message: ChatMessage) => void;
  setPending: (entry: EditableEntry | null) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      pending: null,
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setPending: (entry) => set({ pending: entry }),
      reset: () => set({ messages: [], pending: null }),
    }),
    {
      name: "chat-state",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
