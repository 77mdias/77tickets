import { CheckinForm } from "@/features/checkin/checkin-form";

export default function CheckinPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-3xl flex-col items-center">
        <CheckinForm />
      </main>
    </div>
  );
}
