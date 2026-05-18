import { redirect } from "next/navigation";

export default async function BallMatchAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const params = await searchParams;
  const level = params.level ? `?level=${encodeURIComponent(params.level)}` : "";
  redirect(`/play/ballmatch${level}`);
}
