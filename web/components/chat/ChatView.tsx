'use client';

import { useEffect, useRef, useState } from 'react';
import type { MBTIType } from '@/lib/types';
import { ChatHeader } from './ChatHeader';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { MessageList } from './MessageList';
import { loadOrCreateFingerprint } from './fingerprint';
import { useChat } from './useChat';

interface Props {
  mbti: MBTIType;
}

const EMPTY_HINT_BY_GROUP: Record<string, string> = {
  INTJ: '问点烧脑的，比如"复利的本质是什么？"',
  INTP: '丢一个抽象问题进来，我们慢慢拆。',
  ENTJ: '说目标，我帮你拆战术。',
  ENTP: '今天想拆解什么概念？',
  INFJ: '说说你想搞懂的事，我们由内而外慢慢看。',
  INFP: '想聊点什么，都行。',
  ENFJ: '想学什么？我陪你一起。',
  ENFP: '今天的好奇心是什么？',
  ISTJ: '请按"我想搞懂 X"格式提问，我会逐步讲。',
  ISFJ: '随时问，我会从基础讲起。',
  ESTJ: '说目标 + 时间，我给你计划。',
  ESFJ: '想从哪里开始？',
  ISTP: '说一个具体场景，我们一起拆。',
  ISFP: '想了解什么，慢慢聊。',
  ESTP: '直接说要解决什么问题。',
  ESFP: '今天想搞懂啥？',
};

export function ChatView({ mbti }: Props) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const inputRef = useRef<ChatInputHandle | null>(null);

  useEffect(() => {
    setFingerprint(loadOrCreateFingerprint());
  }, []);

  if (!fingerprint) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        加载中…
      </div>
    );
  }

  return (
    <ChatViewReady
      mbti={mbti}
      fingerprint={fingerprint}
      hint={EMPTY_HINT_BY_GROUP[mbti] ?? '说点什么开始对话吧。'}
      inputRef={inputRef}
    />
  );
}

function ChatViewReady({
  mbti,
  fingerprint,
  hint,
  inputRef,
}: {
  mbti: MBTIType;
  fingerprint: string;
  hint: string;
  inputRef: React.RefObject<ChatInputHandle>;
}) {
  const { state, send, stop, errorText, isStreaming } = useChat({
    mbti,
    fingerprint,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <ChatHeader mbti={mbti} remaining={state.remaining} limit={state.limit} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={state.messages}
            errorText={errorText}
            emptyHint={hint}
          />
        </div>
        <ChatInput
          ref={inputRef}
          onSend={send}
          onStop={stop}
          isStreaming={isStreaming}
        />
      </main>
    </div>
  );
}
