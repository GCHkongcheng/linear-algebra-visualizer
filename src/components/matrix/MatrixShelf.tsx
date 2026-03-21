"use client";

import { Check, ChevronsLeft, ChevronsRight, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { MatrixRecord } from "@/store/matrix-library";

type MatrixShelfProps = {
  items: MatrixRecord[];
  activeMatrixId: string | null;
  onActivate: (item: MatrixRecord) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

function PreviewGrid({ item }: { item: MatrixRecord }) {
  const previewRows = item.data.slice(0, 3);
  const previewCols = Math.min(item.data[0]?.length ?? 0, 4);

  if (previewRows.length === 0 || previewCols === 0) {
    return <div className="text-[11px] text-slate-500">空矩阵</div>;
  }

  return (
    <div className="overflow-auto">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${previewCols}, minmax(26px, 1fr))` }}
      >
        {previewRows.map((row, r) =>
          row.slice(0, previewCols).map((value, c) => {
            const markAugmentedDivider = item.type === "augmented" && c === previewCols - 1;
            return (
              <div
                key={`${item.id}-${r}-${c}`}
                className={`rounded-md border border-slate-200 bg-white px-1 py-0.5 text-center font-mono text-[10px] text-slate-700 ${
                  markAugmentedDivider ? "border-l-2 border-l-dashed border-l-slate-400" : ""
                }`}
                title={value}
              >
                {value}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function MatrixShelf({
  items,
  activeMatrixId,
  onActivate,
  onDelete,
  onRename,
}: MatrixShelfProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const itemCountLabel = useMemo(() => `${items.length} 个矩阵`, [items.length]);

  const startRename = (item: MatrixRecord) => {
    setEditingId(item.id);
    setDraftName(item.name);
  };

  const confirmRename = () => {
    if (!editingId) return;
    onRename(editingId, draftName);
    setEditingId(null);
    setDraftName("");
  };

  if (collapsed) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
        <button
          onClick={() => setCollapsed(false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700"
          title="展开矩阵库"
        >
          <ChevronsRight size={16} />
          <span>{items.length}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            矩阵库
          </div>
          <div className="text-[11px] text-slate-500">{itemCountLabel}</div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-lg border border-slate-200 p-1 text-slate-600"
          title="收起矩阵库"
        >
          <ChevronsLeft size={16} />
        </button>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-500">
            还没有保存的矩阵。
          </div>
        ) : null}

        {items.map((item) => {
          const isActive = item.id === activeMatrixId;
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-2 ${
                isActive
                  ? "border-orange-300 bg-orange-50/70"
                  : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                {isEditing ? (
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        confirmRename();
                      }
                      if (event.key === "Escape") {
                        setEditingId(null);
                        setDraftName("");
                      }
                    }}
                    className="studio-input h-8 text-xs"
                    autoFocus
                  />
                ) : (
                  <div className="truncate font-mono text-xs font-semibold text-slate-800">
                    {item.name}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <button
                      onClick={confirmRename}
                      className="rounded-md border border-slate-200 p-1 text-slate-700"
                      title="保存名称"
                    >
                      <Check size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => startRename(item)}
                      className="rounded-md border border-slate-200 p-1 text-slate-700"
                      title="重命名"
                    >
                      <Pencil size={14} />
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(item.id)}
                    className="rounded-md border border-rose-200 p-1 text-rose-600"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <PreviewGrid item={item} />

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>{item.data.length}x{item.data[0]?.length ?? 0}</span>
                <span>{item.type === "augmented" ? "增广矩阵" : "普通矩阵"}</span>
              </div>

              <button onClick={() => onActivate(item)} className="mt-2 step-control w-full justify-center">
                设为当前活动矩阵
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


