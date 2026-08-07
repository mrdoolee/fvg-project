import { redirect } from "next/navigation";

export default async function TeacherRedirect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  redirect(error ? `/?error=${error}` : "/");
}
