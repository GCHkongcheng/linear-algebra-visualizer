"use client";

import dynamic from "next/dynamic";

function ModuleLoading({ label }: { label: string }) {
  return (
    <div className="workspace-container">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        正在加载{label}...
      </div>
    </div>
  );
}

export const LazyNonlinearSolverPanel = dynamic(
  () => import("@/components/nonlinear/NonlinearSolverPanel").then((mod) => mod.NonlinearSolverPanel),
  {
    loading: () => <ModuleLoading label="非线性方程求根" />,
  }
);

export const LazyApproximationPanel = dynamic(
  () => import("@/components/approximation/ApproximationPanel").then((mod) => mod.ApproximationPanel),
  {
    loading: () => <ModuleLoading label="插值与逼近" />,
  }
);

export const LazyIntegrationPanel = dynamic(
  () => import("@/components/integration/IntegrationPanel").then((mod) => mod.IntegrationPanel),
  {
    loading: () => <ModuleLoading label="数值积分" />,
  }
);

export const LazyOdePanel = dynamic(
  () => import("@/components/ode/OdePanel").then((mod) => mod.OdePanel),
  {
    loading: () => <ModuleLoading label="常微分方程" />,
  }
);
