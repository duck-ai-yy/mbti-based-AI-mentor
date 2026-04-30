'use client';

import { useState, type FormEvent } from 'react';

const EMAIL_MAX_LENGTH = 254;

type Status = 'idle' | 'submitted' | 'invalid';

export function LeadCaptureForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('invalid');
      return;
    }
    setStatus('submitted');
  }

  if (status === 'submitted') {
    return (
      <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
        已记下你的邮箱，新版本上线第一时间通知你。
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 sm:flex-row"
      noValidate
    >
      <label htmlFor="lead-email" className="sr-only">
        邮箱
      </label>
      <input
        id="lead-email"
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        maxLength={EMAIL_MAX_LENGTH}
        placeholder="留下邮箱，新版本第一时间通知你"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === 'invalid') setStatus('idle');
        }}
        className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        aria-invalid={status === 'invalid'}
        aria-describedby={status === 'invalid' ? 'lead-email-error' : undefined}
      />
      <button
        type="submit"
        className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 active:scale-95"
      >
        告诉我
      </button>
      {status === 'invalid' ? (
        <p
          id="lead-email-error"
          role="alert"
          className="text-xs text-red-600 sm:basis-full"
        >
          邮箱格式不对，再检查一下？
        </p>
      ) : null}
    </form>
  );
}
