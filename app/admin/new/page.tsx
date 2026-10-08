import { requireAdmin } from "@/lib/admin/requireAdmin";
import { ManualCandidateForm } from "@/components/admin/ManualCandidateForm";

export default async function Page() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">직접 입력</h1>
      <ManualCandidateForm />
    </div>
  );
}
