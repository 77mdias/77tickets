import { AdminManagementForm } from "@/src/features/admin/management-form";

export default function AdminPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-6xl flex-col items-center">
        <AdminManagementForm />
      </main>
    </div>
  );
}
