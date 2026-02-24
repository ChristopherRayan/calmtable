// Skeleton placeholder used while menu and reservation data loads.
export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-woodAccent/40 bg-warmGray p-5">
      <div className="mb-4 h-40 rounded-xl bg-woodAccent/30" />
      <div className="mb-3 h-4 w-1/2 rounded bg-woodAccent/30" />
      <div className="mb-2 h-3 w-full rounded bg-woodAccent/20" />
      <div className="h-3 w-4/5 rounded bg-woodAccent/20" />
    </div>
  );
}
