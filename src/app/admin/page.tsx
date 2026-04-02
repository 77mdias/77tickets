import { AdminManagementForm } from "@/features/admin/management-form";
import { AnalyticsPanel } from "@/features/admin/analytics-panel";

export default function AdminPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-6xl flex-col gap-6">
        <AdminManagementForm />
        <AnalyticsPanel />
      </main>
    </div>
  );
}
