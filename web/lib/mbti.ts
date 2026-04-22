/**
 * MBTI prompt loader — READ ONLY for feature agents.
 * Loads and caches system prompts from /prompts directory at repo root.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MBTI_GROUPS, type MBTIGroup, type MBTIType } from './types';

const GROUP_OF: Record<MBTIType, MBTIGroup> = (() => {
  const map = {} as Record<MBTIType, MBTIGroup>;
  for (const [group, members] of Object.entries(MBTI_GROUPS) as [
    MBTIGroup,
    readonly MBTIType[],
  ][]) {
    for (const m of members) map[m] = group;
  }
  return map;
})();

const cache = new Map<MBTIType, string>();

const PROMPTS_ROOT = path.resolve(process.cwd(), '..', 'prompts');

export async function loadSystemPrompt(type: MBTIType): Promise<string> {
  const cached = cache.get(type);
  if (cached) return cached;

  const group = GROUP_OF[type];
  const [base, persona] = await Promise.all([
    readFile(path.join(PROMPTS_ROOT, '00_system_base.md'), 'utf-8'),
    readFile(path.join(PROMPTS_ROOT, group, `${type}.md`), 'utf-8'),
  ]);

  const combined = [
    '# BASE PRINCIPLES',
    base.trim(),
    '',
    '---',
    '',
    `# ${type} PERSONA`,
    persona.trim(),
  ].join('\n');

  cache.set(type, combined);
  return combined;
}

export function groupOf(type: MBTIType): MBTIGroup {
  return GROUP_OF[type];
}
