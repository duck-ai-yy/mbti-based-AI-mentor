/**
 * Chat page — OWNER: Agent B.
 * Stub that confirms env is wired. Replace with full conversation UI.
 */
export default function ChatPage({
  searchParams,
}: {
  searchParams: { mbti?: string };
}) {
  const mbti = searchParams.mbti ?? '(unset)';
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">chat · {mbti}</h1>
      <p className="text-sm text-neutral-500">
        [chat placeholder — Agent B to replace with conversation UI that calls /api/chat]
      </p>
    </main>
  );
}
