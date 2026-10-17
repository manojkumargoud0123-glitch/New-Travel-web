/* Lightweight full-area fallback shown by <Suspense> while a lazy route chunk loads. */
export default function PageLoader() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500 dark:border-white/10 dark:border-t-sky-400" />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
          Loading…
        </span>
      </div>
    </div>
  );
}
