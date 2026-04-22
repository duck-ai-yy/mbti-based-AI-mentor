# MBTI Learning Mentor · Web MVP

一个极简 Web MVP，让用户：**选 MBTI → 输入主题 → AI 按你的思维方式讲给你听**。

## 本地启动

```bash
cd web
pnpm install              # 或 npm install
cp .env.example .env.local
# 填入 ANTHROPIC_API_KEY
pnpm dev                  # http://localhost:3000
```

## 目录

```
web/
├── app/                     # Next.js App Router
│   ├── page.tsx            # 落地页  [Agent A]
│   ├── chat/page.tsx       # 对话页  [Agent B]
│   └── api/chat/route.ts   # 后端    [Agent C]
├── components/
│   ├── landing/            # [Agent A]
│   ├── chat/               # [Agent B]
│   ├── paywall/            # [Agent E]
│   └── ui/                 # 共享
├── lib/
│   ├── types.ts            # ⛔ 共享契约，只读
│   ├── mbti.ts             # ⛔ Prompt 加载器
│   ├── utils.ts            # cn() 工具
│   ├── claude.ts           # [Agent C]
│   ├── ratelimit.ts        # [Agent D]
│   ├── security.ts         # [Agent D]
│   ├── stream.ts           # [B + C 共享]
│   └── analytics.ts        # [Agent E]
└── middleware.ts           # [Agent D]
```

## 并行开发

见 `../docs/AGENTS.md`（5 个 agent 的 drop-in prompt）
和 `../docs/MODULE_OWNERSHIP.md`（模块归属）。

## 脚本

- `pnpm dev` — 开发
- `pnpm build` — 生产构建
- `pnpm typecheck` — TS 类型检查
- `pnpm lint` — ESLint
- `pnpm check` — typecheck + lint（提交前必跑）

## 部署

推荐 Vercel：

1. 连接 GitHub
2. Root Directory 设为 `web`
3. 环境变量见 `.env.example`
4. 首次部署后在 Vercel KV / Upstash 建 Redis（生产必须）
