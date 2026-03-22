"use client";

import {
  Camera,
  Check,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";

import type { MatrixKind, MatrixRecord } from "@/store/matrix-library";

type MatrixShelfProps = {
  items: MatrixRecord[];
  activeMatrixId: string | null;
  onActivate: (item: MatrixRecord) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSmartImport: (payload: {
    name: string;
    data: string[][];
    type: MatrixKind;
  }) => void;
};

type ParseResult =
  | { ok: true; data: string[][]; type: MatrixKind }
  | { ok: false; error: string };

type BarcodeDetectorLike = {
  detect: (image: ImageBitmap) => Promise<Array<{ rawValue?: string }>>;
};

function splitRowCells(raw: string): string[] {
  const normalized = raw
    .trim()
    .replaceAll("，", ",")
    .replaceAll("；", ";")
    .replaceAll("｜", "|");

  if (!normalized) return [];

  if (normalized.includes("\t")) {
    return normalized
      .split(/\t+/)
      .map((cell) => cell.trim())
      .filter(Boolean);
  }

  if (normalized.includes(",")) {
    return normalized
      .split(",")
      .map((cell) => cell.trim())
      .filter(Boolean);
  }

  return normalized
    .split(/\s+/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function parseSmartMatrixText(text: string): ParseResult {
  const cleaned = text.trim();
  if (!cleaned) {
    return { ok: false, error: "请输入矩阵内容后再识别。" };
  }

  const normalized = cleaned
    .replace(/\r\n/g, "\n")
    .replaceAll("，", ",")
    .replaceAll("；", ";")
    .replaceAll("｜", "|");

  const rowsRaw =
    normalized.includes("\n")
      ? normalized.split("\n")
      : normalized.includes(";")
        ? normalized.split(";")
        : [normalized];

  const rows = rowsRaw.map((row) => row.trim()).filter(Boolean);
  if (!rows.length) {
    return { ok: false, error: "未识别到有效行，请检查输入格式。" };
  }

  let sawAugmented = false;
  const parsedRows: string[][] = rows.map((row) => {
    if (!row.includes("|")) {
      return splitRowCells(row);
    }

    sawAugmented = true;
    const [leftRaw, ...restRaw] = row.split("|");
    const rightRaw = restRaw.join("|");
    const leftCells = splitRowCells(leftRaw);
    const rightCells = splitRowCells(rightRaw);
    return [...leftCells, ...rightCells];
  });

  if (parsedRows.some((row) => row.length === 0)) {
    return { ok: false, error: "存在空行或空列，请检查分隔符（逗号/分号）。" };
  }

  const colCount = parsedRows[0].length;
  if (colCount === 0) {
    return { ok: false, error: "未识别到列数据，请检查输入。" };
  }

  if (parsedRows.some((row) => row.length !== colCount)) {
    return { ok: false, error: "各行列数不一致，无法生成矩阵。" };
  }

  if (sawAugmented && colCount < 2) {
    return { ok: false, error: "增广矩阵至少需要两列。" };
  }

  return {
    ok: true,
    data: parsedRows,
    type: sawAugmented ? "augmented" : "standard",
  };
}

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
  onSmartImport,
}: MatrixShelfProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const [smartOpen, setSmartOpen] = useState(false);
  const [smartStep, setSmartStep] = useState<"input" | "preview">("input");
  const [smartRawText, setSmartRawText] = useState("");
  const [smartDraftName, setSmartDraftName] = useState("识别矩阵");
  const [smartType, setSmartType] = useState<MatrixKind>("standard");
  const [smartPreview, setSmartPreview] = useState<string[][]>([]);
  const [smartError, setSmartError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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

  const openSmartDialog = () => {
    setSmartOpen(true);
    setSmartStep("input");
    setSmartRawText("");
    setSmartDraftName("识别矩阵");
    setSmartType("standard");
    setSmartPreview([]);
    setSmartError(null);
  };

  const closeSmartDialog = () => {
    setSmartOpen(false);
    setSmartError(null);
    setScanning(false);
  };

  const buildEditablePreview = (text: string) => {
    const parsed = parseSmartMatrixText(text);
    if (!parsed.ok) {
      setSmartError(parsed.error);
      return;
    }

    setSmartPreview(parsed.data.map((row) => row.slice()));
    setSmartType(parsed.type);
    setSmartError(null);
    setSmartStep("preview");
  };

  const triggerImageScan = () => {
    imageInputRef.current?.click();
  };

  const handleScanFromImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;

    if (!Detector) {
      setSmartError("当前浏览器暂不支持扫码识别，请改用文本输入。");
      return;
    }

    setScanning(true);
    setSmartError(null);

    let bitmap: ImageBitmap | null = null;

    try {
      bitmap = await createImageBitmap(file);
      const detector = new Detector({
        formats: ["qr_code", "data_matrix", "aztec", "pdf417"],
      });
      const result = await detector.detect(bitmap);
      const rawValue = result[0]?.rawValue?.trim();

      if (!rawValue) {
        setSmartError("未识别到二维码内容，请重试或改用文本输入。");
        return;
      }

      setSmartRawText(rawValue);
      buildEditablePreview(rawValue);
    } catch {
      setSmartError("扫码失败，请确认图片清晰或改用文本输入。");
    } finally {
      if (bitmap) bitmap.close();
      setScanning(false);
    }
  };

  const updatePreviewCell = (row: number, col: number, value: string) => {
    setSmartPreview((prev) => {
      const next = prev.map((line) => line.slice());
      next[row][col] = value;
      return next;
    });
  };

  const confirmSmartSave = () => {
    if (!smartPreview.length || !smartPreview[0]?.length) {
      setSmartError("矩阵内容为空，无法保存。");
      return;
    }

    onSmartImport({
      name: smartDraftName.trim() || "识别矩阵",
      data: smartPreview,
      type: smartType,
    });
    closeSmartDialog();
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
        <div className="flex items-center gap-1">
          <button
            onClick={openSmartDialog}
            className="step-control"
            title="智能识别"
            type="button"
          >
            <Sparkles size={14} />
            智能识别
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="rounded-lg border border-slate-200 p-1 text-slate-600"
            title="收起矩阵库"
            type="button"
          >
            <ChevronsLeft size={16} />
          </button>
        </div>
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
                <span>
                  {item.data.length}x{item.data[0]?.length ?? 0}
                </span>
                <span>{item.type === "augmented" ? "增广矩阵" : "普通矩阵"}</span>
              </div>

              <button
                onClick={() => onActivate(item)}
                className="mt-2 step-control w-full justify-center"
              >
                设为当前活动矩阵
              </button>
            </div>
          );
        })}
      </div>

      {smartOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">智能识别</div>
                <div className="mt-1 text-xs text-slate-500">
                  输入 `1,1;2,2;3,3` 或上传二维码图片，确认后可继续编辑矩阵。
                </div>
              </div>
              <button onClick={closeSmartDialog} className="step-control" type="button">
                关闭
              </button>
            </div>

            {smartStep === "input" ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={smartRawText}
                  onChange={(event) => setSmartRawText(event.target.value)}
                  className="studio-input min-h-36 resize-y"
                  placeholder="示例：1,1;2,2;3,3 或 1,2|3;4,5|6"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={triggerImageScan}
                    className="step-control"
                    type="button"
                    disabled={scanning}
                  >
                    <Camera size={14} />
                    {scanning ? "识别中..." : "拍照扫码"}
                  </button>
                  <button
                    onClick={() => buildEditablePreview(smartRawText)}
                    className="step-control step-control-primary"
                    type="button"
                  >
                    确认并生成可编辑矩阵
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px]">
                  <div className="matrix-surface">
                    <div className="matrix-scroll">
                      <div
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${smartPreview[0]?.length ?? 1}, minmax(70px, 1fr))`,
                        }}
                      >
                        {smartPreview.map((row, r) =>
                          row.map((value, c) => {
                            const isAugmentedDivider =
                              smartType === "augmented" &&
                              c === (smartPreview[0]?.length ?? 1) - 1;

                            return (
                              <input
                                key={`smart-${r}-${c}`}
                                value={value}
                                onChange={(event) =>
                                  updatePreviewCell(r, c, event.target.value)
                                }
                                className={`matrix-cell matrix-input ${
                                  isAugmentedDivider ? "matrix-cell-augmented" : ""
                                }`}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">矩阵名称</label>
                      <input
                        value={smartDraftName}
                        onChange={(event) => setSmartDraftName(event.target.value)}
                        className="studio-input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">类型</label>
                      <select
                        value={smartType}
                        onChange={(event) => setSmartType(event.target.value as MatrixKind)}
                        className="studio-select w-full"
                      >
                        <option value="standard">普通矩阵</option>
                        <option value="augmented">增广矩阵</option>
                      </select>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      维度：{smartPreview.length}x{smartPreview[0]?.length ?? 0}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => setSmartStep("input")}
                        className="step-control"
                        type="button"
                      >
                        返回识别
                      </button>
                      <button
                        onClick={confirmSmartSave}
                        className="step-control step-control-primary"
                        type="button"
                      >
                        保存到矩阵库
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {smartError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {smartError}
              </div>
            ) : null}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScanFromImage}
              className="hidden"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

