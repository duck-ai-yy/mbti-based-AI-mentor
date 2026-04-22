/**
 * SHARED CONTRACTS — READ ONLY for all feature agents.
 * Only modify with team consensus. Breaking changes cascade everywhere.
 */
import { z } from 'zod';

export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;
export type MBTIType = (typeof MBTI_TYPES)[number];

export const MBTI_GROUPS = {
  NT: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  NF: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  SJ: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  SP: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
} as const satisfies Record<string, readonly MBTIType[]>;

export type MBTIGroup = keyof typeof MBTI_GROUPS;

export const INPUT_LIMITS = {
  messageMaxLength: 4000,
  maxMessagesPerSession: 30,
  fingerprintMaxLength: 128,
  maxOutputTokens: 1024,
  requestTimeoutMs: 30_000,
} as const;

export const mbtiSchema = z.enum(MBTI_TYPES);

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(INPUT_LIMITS.messageMaxLength),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  mbti: mbtiSchema,
  messages: z
    .array(chatMessageSchema)
    .min(1)
    .max(INPUT_LIMITS.maxMessagesPerSession),
  fingerprint: z
    .string()
    .min(8)
    .max(INPUT_LIMITS.fingerprintMaxLength)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid fingerprint'),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

export interface RateLimiter {
  check(fingerprint: string, ip: string): Promise<RateLimitResult>;
  reset(fingerprint: string): Promise<void>;
}

export type ApiErrorCode =
  | 'validation_error'
  | 'rate_limited'
  | 'upstream_error'
  | 'timeout'
  | 'internal_error';

export interface ApiError {
  error: ApiErrorCode;
  message: string;
  retryAfter?: number;
}
