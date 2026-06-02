import { create } from "zustand";
import type { User, Demo, Quota, AgentToken } from "../types";

interface AppState {
  // Data
  user: User | null;
  demos: Demo[];
  quota: Quota | null;
  agentToken: AgentToken | null;
  monthUsage: { used: number; limit: number } | null;

  // Actions
  setUser: (user: User | null) => void;
  setDemos: (demos: Demo[]) => void;
  setQuota: (quota: Quota | null) => void;
  setAgentToken: (token: AgentToken | null) => void;
  setMonthUsage: (usage: { used: number; limit: number } | null) => void;

  // Derived helpers
  isLoggedIn: () => boolean;
  hasDemos: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  demos: [],
  quota: null,
  agentToken: null,
  monthUsage: null,

  setUser: (user) => set({ user }),
  setDemos: (demos) => set({ demos }),
  setQuota: (quota) => set({ quota }),
  setAgentToken: (agentToken) => set({ agentToken }),
  setMonthUsage: (monthUsage) => set({ monthUsage }),

  isLoggedIn: () => get().user !== null,
  hasDemos: () => get().demos.length > 0,
}));