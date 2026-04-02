export function AdminTableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 animate-pulse">
      <div className="mb-4 h-5 w-1/4 rounded bg-zinc-200" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="py-2 pr-4">
                  <div className="h-3 w-16 rounded bg-zinc-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-zinc-100 last:border-0">
                {Array.from({ length: cols }).map((_, colIdx) => (
                  <td key={colIdx} className="py-3 pr-4">
                    <div className="h-4 w-full max-w-[120px] rounded bg-zinc-200" />
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
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-24 rounded bg-zinc-200" />
            <div className="mt-2 h-8 w-20 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <AdminTableSkeleton />
    </div>
  );
}
