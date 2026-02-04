import { create } from "zustand";
import type { EditableEntry } from "@/components/edit-entry-modal";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatState = {
  messages: ChatMessage[];
  pending: EditableEntry | null;
  addMessage: (message: ChatMessage) => void;
  setPending: (entry: EditableEntry | null) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  pending: null,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setPending: (entry) => set({ pending: entry }),
  reset: () => set({ messages: [], pending: null })
}));
