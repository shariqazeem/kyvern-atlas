export default function TransactionsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />
          <div className="h-3 w-48 bg-slate-50 rounded animate-pulse mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-black/[0.06] bg-white p-4 space-y-2">
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-6 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-black/[0.06] bg-white">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-black/[0.03] last:border-0">
            <div className="h-3 w-16 bg-slate-50 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-50 rounded animate-pulse" />
            <div className="h-3 w-12 bg-slate-50 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
