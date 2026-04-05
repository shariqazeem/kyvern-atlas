// Dashboard overview loading skeleton
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Insights skeleton */}
      <div className="rounded-xl border border-black/[0.06] bg-white p-5 space-y-3">
        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-50 rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-slate-50 rounded animate-pulse" />
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-black/[0.06] bg-white p-4 space-y-2">
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="rounded-xl border border-black/[0.06] bg-white p-4">
        <div className="h-48 bg-slate-50 rounded-lg animate-pulse" />
      </div>
      {/* Tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-black/[0.06] bg-white p-4 space-y-3">
            <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-3 w-full bg-slate-50 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
