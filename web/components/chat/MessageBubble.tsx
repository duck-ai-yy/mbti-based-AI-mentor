import { cn } from '@/lib/utils';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  pending: boolean;
}

export function MessageBubble({ role, content, pending }: Props) {
  const isUser = role === 'user';
  const showCursor = !isUser && pending;
  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:text-[15px]',
          isUser
            ? 'rounded-br-sm bg-neutral-900 text-neutral-50'
            : 'rounded-bl-sm bg-white text-neutral-900 ring-1 ring-neutral-200',
        )}
      >
        {content || (pending ? <span className="text-neutral-400">…</span> : '')}
        {showCursor && content ? (
          <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-neutral-400 align-middle" />
        ) : null}
      </div>
    </div>
  );
}
