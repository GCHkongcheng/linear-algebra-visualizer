"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[workbench] route error", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center gap-4">
        <div className="inline-flex w-fit rounded-full border border-rose-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
          运行异常
        </div>
        <h1 className="text-3xl font-semibold">工作台暂时无法继续计算</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          当前实验状态触发了异常。可以重试当前页面，已保存到矩阵库的数据仍会保留在本地。
        </p>
        <button type="button" onClick={reset} className="studio-primary-btn w-fit">
          <RotateCcw size={16} />
          重试
        </button>
      </section>
    </main>
  );
}
