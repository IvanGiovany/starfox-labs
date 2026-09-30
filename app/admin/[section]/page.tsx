import { notFound } from "next/navigation";
import { adminSections } from "@/lib/admin/sections";

// Placeholder for sections whose forms arrive in step 2.4.
export default async function AdminSectionPlaceholder({ params }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  const match = adminSections.find((s) => s.key === section && !s.ready);
  if (!match) notFound();

  return (
    <p className="text-fg-muted">
      Adding and editing {match.label.toLowerCase()} arrives in the next step of the admin.
    </p>
  );
}
