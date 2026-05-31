"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import type { ExperimentModule, SavedExperimentRecord } from "@/types/experiment";

type AddExperimentInput = {
  name: string;
  module: ExperimentModule;
  summary: string;
  payload: unknown;
};

type ExperimentLibraryState = {
  experiments: SavedExperimentRecord[];
  addExperiment: (input: AddExperimentInput) => SavedExperimentRecord;
  deleteExperiment: (id: string) => void;
  clearExperiments: () => void;
};

const STORAGE_KEY = "numerical-analysis-studio.experiment-library";
const STORE_VERSION = 1;

function buildRecordId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `exp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "数值实验";
}

function normalizeExperiment(raw: unknown): SavedExperimentRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<SavedExperimentRecord>;
  if (!item.module || !item.name || !item.createdAt) return null;

  return {
    id: item.id?.trim() || buildRecordId(),
    name: normalizeName(item.name),
    module: item.module,
    summary: item.summary ?? "",
    payload: item.payload ?? null,
    createdAt: item.createdAt,
  };
}

const experimentStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
};

export const useExperimentLibraryStore = create<ExperimentLibraryState>()(
  persist(
    (set) => ({
      experiments: [],
      addExperiment: (input) => {
        const record: SavedExperimentRecord = {
          id: buildRecordId(),
          name: normalizeName(input.name),
          module: input.module,
          summary: input.summary,
          payload: input.payload,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          experiments: [record, ...state.experiments].slice(0, 80),
        }));

        return record;
      },
      deleteExperiment: (id) => {
        set((state) => ({
          experiments: state.experiments.filter((item) => item.id !== id),
        }));
      },
      clearExperiments: () => {
        set({ experiments: [] });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => experimentStorage),
      migrate: (persistedState) => {
        const state = persistedState as Partial<ExperimentLibraryState> | undefined;
        return {
          experiments: Array.isArray(state?.experiments)
            ? state.experiments
                .map((item) => normalizeExperiment(item))
                .filter((item): item is SavedExperimentRecord => item !== null)
            : [],
        };
      },
      partialize: (state) => ({
        experiments: state.experiments,
      }),
    }
  )
);
