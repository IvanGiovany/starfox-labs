import { redirect } from "next/navigation";

// /admin opens the Writing tab.
export default function AdminHome() {
  redirect("/admin/writing");
}
