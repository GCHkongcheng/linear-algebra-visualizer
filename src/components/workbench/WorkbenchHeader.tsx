import { CircleHelp, Menu } from "lucide-react";
import Link from "next/link";

import type { NavSection } from "@/types/workbench";

type WorkbenchHeaderProps = {
  navSections: NavSection[];
  activeSectionTitle?: string;
  onOpenNavDrawer: () => void;
  onSectionSwitch: (sectionTitle: string) => void;
};

export function WorkbenchHeader({
  navSections,
  activeSectionTitle,
  onOpenNavDrawer,
  onSectionSwitch,
}: WorkbenchHeaderProps) {
  return (
    <header className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNavDrawer}
            className="step-control lg:hidden"
            aria-label="打开导航菜单"
          >
            <Menu size={14} />
            菜单
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
            数值分析实验室
          </div>
        </div>
        <Link href="/about" className="step-control" aria-label="打开关于页面">
          <CircleHelp size={14} />
          关于页面
        </Link>
      </div>
      <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
        数值分析工作台
      </h1>
      <p className="max-w-3xl text-base text-slate-700">
        按数值分析学习路径组织功能：从数值线性代数出发，继续探索非线性方程、插值逼近、数值积分、常微分方程，以及误差与稳定性分析。
      </p>
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 p-2">
        {navSections.map((section) => {
          const isActive = section.title === activeSectionTitle;
          return (
            <button
              key={section.title}
              type="button"
              onClick={() => onSectionSwitch(section.title)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {section.title}
            </button>
          );
        })}
      </div>
    </header>
  );
}
