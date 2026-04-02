import { AdminDashboardSkeleton } from "@/features/admin/admin-table-skeleton";

export default function AdminLoading() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-10">
      <main className="flex w-full max-w-6xl flex-col gap-6">
        <div className="h-8 w-40 rounded bg-zinc-200 animate-pulse" />
        <AdminDashboardSkeleton />
      </main>
    </div>
  );
}
