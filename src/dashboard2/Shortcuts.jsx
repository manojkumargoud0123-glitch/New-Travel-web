import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { nav } from "../data/nav";
import { Panel } from "./kit.jsx";

// Every module page from the main nav, so this list stays in step with it
const LINKS = nav.flatMap((section) =>
  (section.children || []).map((child) => ({ ...child, group: section.label }))
);

export default function Shortcuts() {
  return (
    <Panel title="Shortcuts" subtitle="Jump straight to a module">
      <ul className="-mx-2 flex flex-col">
        {LINKS.map(({ to, label, group, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-white/[0.05] dark:text-primary-300">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                <span className="block truncate text-[11.5px] font-medium text-slate-400 dark:text-slate-500">{group}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
