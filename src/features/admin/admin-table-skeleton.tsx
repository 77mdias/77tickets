export function AdminTableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-white/10 p-4 animate-pulse">
      <div className="mb-4 h-5 w-1/4 rounded bg-white/10" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/10">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="py-2 pr-4">
                  <div className="h-3 w-16 rounded bg-white/10" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-white/5 last:border-0">
                {Array.from({ length: cols }).map((_, colIdx) => (
                  <td key={colIdx} className="py-3 pr-4">
                    <div className="h-4 w-full max-w-[120px] rounded bg-white/10" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="mt-2 h-8 w-20 rounded bg-white/10" />
          </div>
        ))}
      </div>
      <AdminTableSkeleton />
    </div>
  );
}
