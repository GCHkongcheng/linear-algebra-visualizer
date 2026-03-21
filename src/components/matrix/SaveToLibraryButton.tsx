"use client";

import { Save } from "lucide-react";
import { useState } from "react";

type SaveToLibraryButtonProps = {
  defaultName: string;
  disabled?: boolean;
  onSave: (name: string) => void;
};

export function SaveToLibraryButton({
  defaultName,
  disabled = false,
  onSave,
}: SaveToLibraryButtonProps) {
  const [open, setOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(defaultName);

  const openDialog = () => {
    setNameDraft(defaultName);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
  };

  const confirmSave = () => {
    const finalName = nameDraft.trim() || defaultName;
    onSave(finalName);
    setOpen(false);
  };

  return (
    <>
      <button onClick={openDialog} disabled={disabled} className="step-control" type="button">
        <Save size={14} />
        存入库
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="text-sm font-semibold text-slate-900">保存矩阵</div>
            <div className="mt-1 text-xs text-slate-500">
              请输入名称，重名会自动追加后缀。
            </div>

            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmSave();
                }
                if (event.key === "Escape") {
                  closeDialog();
                }
              }}
              className="studio-input mt-3"
              autoFocus
            />

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeDialog} className="step-control" type="button">
                取消
              </button>
              <button
                onClick={confirmSave}
                className="step-control step-control-primary"
                type="button"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
