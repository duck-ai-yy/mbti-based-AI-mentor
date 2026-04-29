'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { streamResponse, type StreamEvent } from '@/lib/stream';
import type { ChatMessage, MBTIType } from '@/lib/types';

export type ChatErrorKind =
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'server'
  | 'unknown';

export interface ChatErrorState {
  kind: ChatErrorKind;
  message: string;
}

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending: boolean;
}

export type ChatStatus = 'idle' | 'streaming';

interface State {
  messages: DisplayMessage[];
  status: ChatStatus;
  error: ChatErrorState | null;
  remaining: number | null;
  limit: number | null;
}

type Action =
  | { type: 'add'; message: DisplayMessage }
  | { type: 'start' }
  | { type: 'append_delta'; id: string; delta: string }
  | { type: 'meta'; remaining: number; limit: number }
  | { type: 'finish'; id: string }
  | { type: 'error'; id: string | null; error: ChatErrorState }
  | { type: 'clear_error' };

const ERROR_TEXTS: Record<ChatErrorKind, string> = {
  network: '连接失败，请检查网络后重试',
  timeout: '服务器响应超时，请重试',
  rate_limit: '今日免费次数用完，加微信继续 →',
  server: '服务暂时不可用，稍后再试',
  unknown: '出了点问题，请重试',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { ...state, messages: [...state.messages, action.message] };
    case 'start':
      return { ...state, status: 'streaming', error: null };
    case 'append_delta':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, content: m.content + action.delta } : m,
        ),
      };
    case 'meta':
      return { ...state, remaining: action.remaining, limit: action.limit };
    case 'finish':
      return {
        ...state,
        status: 'idle',
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, pending: false } : m,
        ),
      };
    case 'error':
      return {
        ...state,
        status: 'idle',
        error: action.error,
        messages: action.id
          ? state.messages.map((m) =>
              m.id === action.id ? { ...m, pending: false } : m,
            )
          : state.messages,
      };
    case 'clear_error':
      return { ...state, error: null };
    default:
      return state;
  }
}

const INITIAL_STATE: State = {
  messages: [],
  status: 'idle',
  error: null,
  remaining: null,
  limit: null,
};

const INACTIVITY_TIMEOUT_MS = 30_000;

interface UseChatOptions {
  mbti: MBTIType;
  fingerprint: string;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dispatchQuotaExhausted(detail: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('quota:exhausted', { detail }));
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function toApiMessages(messages: DisplayMessage[]): ChatMessage[] {
  return messages
    .filter((m) => m.content.length > 0)
    .map((m) => ({ role: m.role, content: m.content }));
}

export function useChat({ mbti, fingerprint }: UseChatOptions): {
  state: State;
  send: (text: string) => Promise<void>;
  stop: () => void;
  errorText: string | null;
  isStreaming: boolean;
} {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userAbortRef = useRef(false);
  const timedOutRef = useRef(false);
  const mountedRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const armInactivityTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      const ctrl = controllerRef.current;
      if (ctrl) {
        timedOutRef.current = true;
        userAbortRef.current = false;
        ctrl.abort();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearTimer]);

  const stop = useCallback(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    userAbortRef.current = true;
    ctrl.abort();
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimer();
      const ctrl = controllerRef.current;
      if (ctrl) {
        userAbortRef.current = true;
        ctrl.abort();
      }
    };
  }, [clearTimer]);

  const send = useCallback(
    async (rawText: string): Promise<void> => {
      const text = rawText.trim();
      if (!text) return;
      if (stateRef.current.status === 'streaming') return;

      dispatch({ type: 'clear_error' });

      const userMessage: DisplayMessage = {
        id: genId(),
        role: 'user',
        content: text,
        pending: false,
      };
      const assistantMessage: DisplayMessage = {
        id: genId(),
        role: 'assistant',
        content: '',
        pending: true,
      };

      dispatch({ type: 'add', message: userMessage });
      dispatch({ type: 'add', message: assistantMessage });
      dispatch({ type: 'start' });

      const apiMessages = toApiMessages([
        ...stateRef.current.messages,
        userMessage,
      ]);

      const controller = new AbortController();
      controllerRef.current = controller;
      userAbortRef.current = false;
      timedOutRef.current = false;
      armInactivityTimer();

      let response: Response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mbti,
            messages: apiMessages,
            fingerprint,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimer();
        controllerRef.current = null;
        if (userAbortRef.current && isAbortError(err)) {
          dispatch({ type: 'finish', id: assistantMessage.id });
          return;
        }
        const isTimeout = timedOutRef.current;
        dispatch({
          type: 'error',
          id: assistantMessage.id,
          error: {
            kind: isTimeout ? 'timeout' : 'network',
            message: ERROR_TEXTS[isTimeout ? 'timeout' : 'network'],
          },
        });
        return;
      }

      if (response.status === 429) {
        clearTimer();
        controllerRef.current = null;
        const retryAfter = response.headers.get('Retry-After');
        dispatch({
          type: 'error',
          id: assistantMessage.id,
          error: { kind: 'rate_limit', message: ERROR_TEXTS.rate_limit },
        });
        dispatchQuotaExhausted({
          source: 'http_429',
          retryAfter: retryAfter ?? null,
        });
        return;
      }

      if (!response.ok && response.status >= 500) {
        clearTimer();
        controllerRef.current = null;
        dispatch({
          type: 'error',
          id: assistantMessage.id,
          error: { kind: 'server', message: ERROR_TEXTS.server },
        });
        return;
      }

      let receivedDone = false;
      let receivedAnyDelta = false;
      let streamErrorKind: ChatErrorKind | null = null;
      try {
        for await (const event of streamResponse(response) as AsyncIterable<StreamEvent>) {
          armInactivityTimer();
          if (event.type === 'delta') {
            const delta = typeof event.data === 'string' ? event.data : '';
            if (delta) {
              receivedAnyDelta = true;
              dispatch({
                type: 'append_delta',
                id: assistantMessage.id,
                delta,
              });
            }
          } else if (event.type === 'meta') {
            const data = event.data as Record<string, unknown> | undefined;
            const remaining =
              typeof data?.remaining === 'number' ? data.remaining : null;
            const limit = typeof data?.limit === 'number' ? data.limit : null;
            if (remaining !== null && limit !== null) {
              dispatch({ type: 'meta', remaining, limit });
            }
            if (remaining === 0) {
              dispatchQuotaExhausted({ source: 'meta', remaining, limit });
            }
          } else if (event.type === 'error') {
            const code =
              typeof event.data === 'string' ? event.data : 'unknown_error';
            if (code === 'rate_limited') {
              streamErrorKind = 'rate_limit';
              dispatchQuotaExhausted({ source: 'sse_error', code });
            } else if (
              code === 'upstream_error' ||
              code === 'internal_error' ||
              code === 'timeout'
            ) {
              streamErrorKind = 'server';
            } else {
              streamErrorKind = 'unknown';
            }
          } else if (event.type === 'done') {
            receivedDone = true;
          }
        }
      } catch (err) {
        clearTimer();
        controllerRef.current = null;
        if (!mountedRef.current) return;
        if (userAbortRef.current && isAbortError(err)) {
          dispatch({ type: 'finish', id: assistantMessage.id });
          return;
        }
        const isTimeout = timedOutRef.current;
        dispatch({
          type: 'error',
          id: assistantMessage.id,
          error: {
            kind: isTimeout ? 'timeout' : 'network',
            message: ERROR_TEXTS[isTimeout ? 'timeout' : 'network'],
          },
        });
        return;
      }

      clearTimer();
      controllerRef.current = null;
      if (!mountedRef.current) return;

      if (streamErrorKind) {
        dispatch({
          type: 'error',
          id: assistantMessage.id,
          error: {
            kind: streamErrorKind,
            message: ERROR_TEXTS[streamErrorKind],
          },
        });
        return;
      }

      if (!receivedDone && !receivedAnyDelta) {
        dispatch({
          type: 'error',
          id: assistantMessage.id,
          error: { kind: 'server', message: ERROR_TEXTS.server },
        });
        return;
      }

      dispatch({ type: 'finish', id: assistantMessage.id });
    },
    [armInactivityTimer, clearTimer, fingerprint, mbti],
  );

  return {
    state,
    send,
    stop,
    errorText: state.error?.message ?? null,
    isStreaming: state.status === 'streaming',
  };
}
