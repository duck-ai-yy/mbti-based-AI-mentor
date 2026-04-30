import type { MBTIType, MBTIGroup } from '@/lib/types';

export interface DemoCard {
  mbti: MBTIType;
  group: MBTIGroup;
  persona: string;
  vibe: string;
  lines: readonly [string, string, string];
}

export const DEMO_TOPIC = '为什么 GDP 不等于幸福？';

export const DEMO_CARDS: readonly DemoCard[] = [
  {
    mbti: 'INTJ',
    group: 'NT',
    persona: '战略架构师',
    vibe: '先建模，再代入',
    lines: [
      '先把这个问题拆成两个变量：GDP 衡量"产出总额"，幸福衡量"主观体验"。',
      '它们之间的关联只在分配、闲暇、安全感这些中间层里发生——所以单一标量不可能等价。',
      '我们先画出三层因果图，再讨论哪一层政策能撬动幸福而不必扩 GDP。',
    ],
  },
  {
    mbti: 'ENFP',
    group: 'NF',
    persona: '灵感激活者',
    vibe: '用故事点燃你',
    lines: [
      '想象一座城市 GDP 翻倍，但每个人都困在 996 里——街上没有人笑，那是繁荣吗？',
      '幸福不是数字，是你晚饭后愿不愿意散步、愿不愿意给妈妈打电话。',
      '今天我们从"哪一刻你觉得活着真好"开始倒推，你会发现 GDP 只是配角。',
    ],
  },
  {
    mbti: 'ISTJ',
    group: 'SJ',
    persona: '步骤执行者',
    vibe: '先定义，再核对',
    lines: [
      '第一步，我们对齐两个名词：GDP = 一国一年生产的市场产品总值；幸福 = 个体长期生活满意度评分。',
      '第二步，看证据：Easterlin 1974 年发现人均 GDP 越过约 $15k 之后，平均幸福停止增长。',
      '第三步，列出三个让两者脱钩的具体机制：贫富差距、工时、环境成本——逐条核对。',
    ],
  },
  {
    mbti: 'ESFP',
    group: 'SP',
    persona: '沉浸体验派',
    vibe: '直接给你试一把',
    lines: [
      '我们做个小测试：假设你下个月工资涨 30%，但要每天加班到 11 点。你会答应吗？',
      '大多数人会犹豫——因为你的身体已经在替你回答："钱不是唯一的幸福指标"。',
      '现在把这个直觉放大到一个国家，你就明白为什么 GDP 涨了，人却不一定开心。',
    ],
  },
] as const;
