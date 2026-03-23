"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type DocKey = "readme" | "changelog";

type AboutDocLinksProps = {
  readmeTitle: string;
  changelogTitle: string;
  readmeContent: string;
  changelogContent: string;
};

export function AboutDocLinks({
  readmeTitle,
  changelogTitle,
  readmeContent,
  changelogContent,
}: AboutDocLinksProps) {
  const [activeDoc, setActiveDoc] = useState<DocKey | null>(null);

  const active = useMemo(() => {
    if (activeDoc === "readme") {
      return { title: readmeTitle, content: readmeContent };
    }
    if (activeDoc === "changelog") {
      return { title: changelogTitle, content: changelogContent };
    }
    return null;
  }, [activeDoc, changelogContent, changelogTitle, readmeContent, readmeTitle]);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          onClick={() => setActiveDoc("readme")}
          className="cursor-pointer text-orange-700 underline decoration-orange-300 underline-offset-4 transition hover:text-orange-800"
        >
          {readmeTitle}
        </button>
        <button
          type="button"
          onClick={() => setActiveDoc("changelog")}
          className="cursor-pointer text-orange-700 underline decoration-orange-300 underline-offset-4 transition hover:text-orange-800"
        >
          {changelogTitle}
        </button>
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActiveDoc(null);
            }
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="text-base font-semibold text-slate-900">
                {active.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="cursor-pointer rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                关闭
              </button>
            </div>
            <div className="max-h-[calc(85vh-58px)] overflow-auto px-5 py-4">
              <div className="prose prose-slate max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {active.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
