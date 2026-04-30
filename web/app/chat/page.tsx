import { redirect } from 'next/navigation';
import { ChatView } from '@/components/chat/ChatView';
import { MBTI_TYPES, type MBTIType } from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseMbti(raw: string | undefined): MBTIType | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return (MBTI_TYPES as readonly string[]).includes(upper)
    ? (upper as MBTIType)
    : null;
}

export default function ChatPage({
  searchParams,
}: {
  searchParams: { mbti?: string };
}) {
  const mbti = parseMbti(searchParams.mbti);
  if (!mbti) redirect('/');
  return <ChatView mbti={mbti} />;
}
