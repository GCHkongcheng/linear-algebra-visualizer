"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type MatrixKind = "standard" | "augmented";

export type MatrixRecord = {
  id: string;
  name: string;
  data: string[][];
  createdAt: string;
  type: MatrixKind;
};

export type ActiveContext =
  | "matrix-operations"
  | "linear-system"
  | "determinant"
  | "decomposition"
  | "eigen";

type AddMatrixInput = {
  name?: string;
  data: string[][];
  type?: MatrixKind;
};

type LegacyMatrixRecord = {
  id?: string;
  name?: string;
  matrix?: unknown;
  updatedAt?: number;
  source?: string;
};

type MatrixLibraryState = {
  matrixInventory: MatrixRecord[];
  activeMatrixId: string | null;
  addMatrix: (input: AddMatrixInput) => MatrixRecord | null;
  renameMatrix: (id: string, nextName: string) => void;
  deleteMatrix: (id: string) => void;
  setActiveMatrix: (id: string | null, context?: ActiveContext) => void;
  saveCurrentResultToLibrary: (
    result: string[][] | null,
    context: ActiveContext,
    suggestedType?: MatrixKind,
    preferredName?: string
  ) => MatrixRecord | null;
};

const STORAGE_KEY = "linear-algebra-studio.matrix-library";
const STORE_VERSION = 2;

function cloneMatrixData(data: string[][]): string[][] {
  return data.map((row) => row.map((cell) => `${cell ?? "0"}`));
}

function normalizeMatrixData(raw: unknown): string[][] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const rows = raw as unknown[];
  const normalized = rows.map((row) => {
    if (!Array.isArray(row)) return [] as string[];
    return row.map((cell) => `${cell ?? "0"}`);
  });
  const colCount = normalized[0]?.length ?? 0;
  if (colCount <= 0 || normalized.some((row) => row.length !== colCount)) {
    return null;
  }
  return normalized;
}

function inferLegacyType(source?: string): MatrixKind {
  if (!source) return "standard";
  return source.includes("system") || source.includes("augmented")
    ? "augmented"
    : "standard";
}

function buildRecordId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mat-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeBaseName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "矩阵";
}

function uniqueNameFromInventory(
  inventory: MatrixRecord[],
  preferredName: string,
  reservedId?: string
): string {
  const base = normalizeBaseName(preferredName);
  const lowered = new Set(
    inventory
      .filter((item) => item.id !== reservedId)
      .map((item) => item.name.trim().toLocaleLowerCase())
  );

  if (!lowered.has(base.toLocaleLowerCase())) {
    return base;
  }

  let suffix = 2;
  while (true) {
    const candidate = `${base} (${suffix})`;
    if (!lowered.has(candidate.toLocaleLowerCase())) {
      return candidate;
    }
    suffix += 1;
  }
}

function defaultNameByContext(context: ActiveContext): string {
  switch (context) {
    case "matrix-operations":
      return "运算结果";
    case "linear-system":
      return "方程组结果";
    case "determinant":
      return "行列式矩阵";
    case "decomposition":
      return "分解结果";
    case "eigen":
      return "特征分析矩阵";
    default:
      return "结果";
  }
}

function migrateLegacyArray(list: LegacyMatrixRecord[]): MatrixRecord[] {
  return list
    .map((item, index) => {
      const normalizedData = normalizeMatrixData(item.matrix);
      if (!normalizedData) return null;

      const createdAtRaw =
        typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
          ? new Date(item.updatedAt).toISOString()
          : new Date().toISOString();

      return {
        id: item.id?.trim() || `${buildRecordId()}-${index}`,
        name: normalizeBaseName(item.name ?? `矩阵 ${index + 1}`),
        data: normalizedData,
        createdAt: createdAtRaw,
        type: inferLegacyType(item.source),
      } satisfies MatrixRecord;
    })
    .filter((item): item is MatrixRecord => item !== null);
}

function normalizePersistedState(raw: unknown): {
  matrixInventory: MatrixRecord[];
  activeMatrixId: string | null;
} {
  const fallback = { matrixInventory: [], activeMatrixId: null as string | null };

  if (!raw || typeof raw !== "object") return fallback;

  const candidate = raw as {
    matrixInventory?: unknown;
    activeMatrixId?: unknown;
  };

  if (!Array.isArray(candidate.matrixInventory)) return fallback;

  const matrixInventory = candidate.matrixInventory
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Partial<MatrixRecord>;
      const normalizedData = normalizeMatrixData(item.data);
      if (!normalizedData) return null;

      const type: MatrixKind = item.type === "augmented" ? "augmented" : "standard";
      const name = normalizeBaseName(item.name ?? "矩阵");
      const id = item.id?.trim() || buildRecordId();
      const createdAt =
        item.createdAt && item.createdAt.trim()
          ? item.createdAt
          : new Date().toISOString();

      return {
        id,
        name,
        data: normalizedData,
        createdAt,
        type,
      } satisfies MatrixRecord;
    })
    .filter((item): item is MatrixRecord => item !== null);

  const activeMatrixId =
    typeof candidate.activeMatrixId === "string" &&
    candidate.activeMatrixId.trim().length > 0
      ? candidate.activeMatrixId
      : null;

  return { matrixInventory, activeMatrixId };
}

const matrixLibraryStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(name);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (Array.isArray(parsed)) {
        const migrated = {
          state: {
            matrixInventory: migrateLegacyArray(parsed as LegacyMatrixRecord[]),
            activeMatrixId: null,
          },
          version: STORE_VERSION,
        };
        const serialized = JSON.stringify(migrated);
        window.localStorage.setItem(name, serialized);
        return serialized;
      }

      return raw;
    } catch {
      return null;
    }
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

export function suggestMatrixName(
  inventory: MatrixRecord[],
  preferredName: string,
  reservedId?: string
): string {
  return uniqueNameFromInventory(inventory, preferredName, reservedId);
}

export function suggestNameForContext(
  inventory: MatrixRecord[],
  context: ActiveContext
): string {
  return uniqueNameFromInventory(inventory, defaultNameByContext(context));
}

export const useMatrixLibraryStore = create<MatrixLibraryState>()(
  persist(
    (set, get) => ({
      matrixInventory: [],
      activeMatrixId: null,
      addMatrix: (input) => {
        const normalizedData = normalizeMatrixData(input.data);
        if (!normalizedData) return null;

        const nowIso = new Date().toISOString();
        const nextId = buildRecordId();
        const nextType = input.type ?? "standard";

        let createdRecord: MatrixRecord | null = null;

        set((state) => {
          const finalName = uniqueNameFromInventory(
            state.matrixInventory,
            input.name ?? "矩阵"
          );
          createdRecord = {
            id: nextId,
            name: finalName,
            data: cloneMatrixData(normalizedData),
            createdAt: nowIso,
            type: nextType,
          };

          return {
            matrixInventory: [createdRecord, ...state.matrixInventory],
            activeMatrixId: state.activeMatrixId,
          };
        });

        return createdRecord;
      },
      renameMatrix: (id, nextName) => {
        const desired = nextName.trim();
        if (!desired) return;

        set((state) => {
          const target = state.matrixInventory.find((item) => item.id === id);
          if (!target) return state;

          const resolvedName = uniqueNameFromInventory(
            state.matrixInventory,
            desired,
            id
          );
          return {
            matrixInventory: state.matrixInventory.map((item) =>
              item.id === id ? { ...item, name: resolvedName } : item
            ),
            activeMatrixId: state.activeMatrixId,
          };
        });
      },
      deleteMatrix: (id) => {
        set((state) => ({
          matrixInventory: state.matrixInventory.filter((item) => item.id !== id),
          activeMatrixId: state.activeMatrixId === id ? null : state.activeMatrixId,
        }));
      },
      setActiveMatrix: (id, _context) => {
        void _context;
        set((state) => {
          if (!id) {
            return { activeMatrixId: null, matrixInventory: state.matrixInventory };
          }

          const exists = state.matrixInventory.some((item) => item.id === id);
          return {
            matrixInventory: state.matrixInventory,
            activeMatrixId: exists ? id : state.activeMatrixId,
          };
        });
      },
      saveCurrentResultToLibrary: (result, context, suggestedType, preferredName) => {
        if (!result || result.length === 0 || !result[0]?.length) return null;

        return get().addMatrix({
          data: result,
          type: suggestedType ?? "standard",
          name: preferredName?.trim() || defaultNameByContext(context),
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => matrixLibraryStorage),
      migrate: (persistedState) => {
        const normalized = normalizePersistedState(persistedState);
        return {
          ...normalized,
        };
      },
      partialize: (state) => ({
        matrixInventory: state.matrixInventory,
        activeMatrixId: state.activeMatrixId,
      }),
    }
  )
);





