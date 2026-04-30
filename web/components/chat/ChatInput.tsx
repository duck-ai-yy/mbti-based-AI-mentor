'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { INPUT_LIMITS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export interface ChatInputHandle {
  focus: () => void;
}

const MAX = INPUT_LIMITS.messageMaxLength;

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput(
  { onSend, onStop, isStreaming },
  ref,
) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setValue('');
  }, [isStreaming, onSend, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const remaining = MAX - value.length;
  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div className="border-t border-neutral-200 bg-neutral-50/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="flex-1 rounded-2xl bg-white p-2 ring-1 ring-neutral-200 focus-within:ring-2 focus-within:ring-neutral-900">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX))}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={MAX}
            disabled={isStreaming}
            placeholder={isStreaming ? '正在生成回答…' : '输入消息，Enter 发送，Shift+Enter 换行'}
            aria-label="输入消息"
            className={cn(
              'block w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-neutral-400 sm:text-[15px]',
              isStreaming && 'cursor-not-allowed opacity-60',
            )}
          />
          {value.length > MAX * 0.8 ? (
            <div className="px-2 pb-1 text-right text-xs text-neutral-400">
              {remaining}
            </div>
          ) : null}
        </div>
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="shrink-0 rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 active:bg-red-800"
            aria-label="停止生成"
          >
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className={cn(
              'shrink-0 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-colors',
              canSend
                ? 'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-black'
                : 'cursor-not-allowed bg-neutral-200 text-neutral-400',
            )}
            aria-label="发送消息"
          >
            发送
          </button>
        )}
      </div>
    </div>
  );
});
