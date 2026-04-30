'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { DisplayMessage } from './useChat';

interface Props {
  messages: DisplayMessage[];
  errorText: string | null;
  emptyHint?: string;
}

export function MessageList({ messages, errorText, emptyHint }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, errorText]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-neutral-500">
        {emptyHint ?? '说点什么开始对话吧。'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          role={m.role}
          content={m.content}
          pending={m.pending}
        />
      ))}
      {errorText ? (
        <div
          role="alert"
          className="self-start rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
        >
          {errorText}
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
