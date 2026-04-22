# 多 Agent 并行开发工作流

## 总体思路

5 个 agent 并行，每个在**独立分支**工作。共享契约（`lib/types.ts`、`lib/mbti.ts`）先锁定，其他目录严格按 `MODULE_OWNERSHIP.md` 分治。

合并顺序：**D → C → B → (A、E 随时)**

## 运行前置

每个 agent 窗口启动前先做：

```bash
cd web
pnpm install           # 或 npm install
cp .env.example .env.local
# 填入 ANTHROPIC_API_KEY
pnpm dev               # http://localhost:3000
```

## 通用准入规则（所有 agent 头部都贴这段）

```
你是这个仓库的 Agent X，严格遵守以下规则：

1. 必读：docs/MODULE_OWNERSHIP.md 和 docs/SECURITY.md
2. 你只能修改 MODULE_OWNERSHIP.md 中标注属于你的文件
3. 共享契约（web/lib/types.ts、web/lib/mbti.ts）只读。如必须修改，停下来问用户
4. TypeScript 严格模式，禁止 any（必要时写注释说明）
5. 所有 API 边界用 Zod 验证
6. 永远不把 ANTHROPIC_API_KEY 写进客户端代码
7. 每完成一个可运行的子功能就 commit，commit message 用中文短句说"做了什么 + 为什么"
8. 提交前必须跑通：pnpm typecheck && pnpm lint
9. 在你负责的分支上工作，不要动别的分支
10. 如果发现别的 agent 的 bug 或架构问题，记录在 issue 不要直接改
```

---

## Agent A · 落地页 + 首屏转化

**分支**：`feat/a-landing`

```
你是 Agent A（落地页）。遵守 docs/AGENTS.md 的通用准入规则。

任务：把 web/app/page.tsx 做成一个能让小红书导流用户"30 秒被击中、
立刻想试"的单页落地页。

你可写：
- web/app/page.tsx
- web/components/landing/**
- web/public/**

你只读：
- web/lib/types.ts（用 MBTI_TYPES、MBTI_GROUPS）
- web/lib/utils.ts

必须实现（按优先级）：
1. Hero：主标题"按你的 MBTI 思维方式学任何东西" + 副标题 + 主 CTA
   - 主 CTA 直接是 "选择你的 MBTI" 的 4x4 网格，点击后跳 /chat?mbti=XXXX
   - 每个 MBTI 按 NT/NF/SJ/SP 分组着色（用 tailwind.config.ts 的 mbti 色板）
2. 对比 Demo：同一个主题（建议"为什么 GDP 不等于幸福"），
   4 个静态气泡卡片分别展示 INTJ / ENFP / ISTJ / ESFP 四种讲法的开头 3 行
   —— 让用户一眼看出差异。文本写死在组件里即可，不调 API。
3. 底部：MIT License 提示 + GitHub 链接 + 邮箱/微信留资入口（占位）

代码质量：
- 移动优先响应式（最窄 320px 不出横向滚动条）
- 所有图片加 alt 属性
- 不用 <a>，用 next/link 做内部跳转
- 对比 Demo 的文案放 web/components/landing/demo-content.ts 常量里

安全：
- 不引入未审阅的第三方依赖（如 framer-motion 可以，但要注明）
- 外部链接一律 target="_blank" rel="noopener noreferrer"

验收：
- pnpm dev 访问 / 能看到完整落地页
- 点击任一 MBTI 跳转到 /chat?mbti=XXXX
- Lighthouse Performance > 85（桌面）
- pnpm typecheck && pnpm lint 通过

完成后 commit 并 push feat/a-landing。
```

---

## Agent B · 对话 UI + 流式渲染

**分支**：`feat/b-chat-ui`

```
你是 Agent B（对话 UI）。遵守 docs/AGENTS.md 的通用准入规则。

任务：在 /chat 页面做出一个能流式对话的界面，调用 POST /api/chat。

你可写：
- web/app/chat/page.tsx
- web/components/chat/**
- web/lib/stream.ts 的客户端部分（encodeSSE 别动，那是 server 用的）

你只读：
- web/lib/types.ts（ChatMessage、ChatRequest、MBTIType、INPUT_LIMITS）
- POST /api/chat 的 SSE 契约（见 web/lib/stream.ts 的 streamResponse）

必须实现：
1. 从 URL 读取 ?mbti=XXXX，不合法时跳回首页
2. 生成浏览器指纹（用 crypto.randomUUID 持久化到 localStorage 即可，不必 fingerprintjs）
3. 消息列表（user / assistant 气泡，支持流式 append）
4. 输入框：
   - maxLength = INPUT_LIMITS.messageMaxLength
   - 回车发送，Shift+Enter 换行
   - 发送中禁用 + 取消按钮（AbortController 中断流）
5. 剩余次数展示（从 /api/chat 的响应 header 或首个 meta 事件读 remaining）
6. 配额耗尽（收到 429 或 meta.remaining === 0）触发 window.dispatchEvent("quota:exhausted")
   —— Agent E 的 paywall 会监听这个事件
7. 错误态：网络断、超时、429、500 都要有明确 UI 文案

代码质量：
- 用 React Server Component + 单个 "use client" 组件承载整个对话
- 流式用 web/lib/stream.ts 的 streamResponse 异步迭代器
- 消息渲染**不要**用 dangerouslySetInnerHTML（XSS 风险）
- 代码块/markdown 渲染：可选，用 react-markdown + rehype-sanitize（要加依赖）

鲁棒性：
- 组件卸载时 reader.cancel()
- localStorage 被禁用时降级到会话内存指纹
- 连续 2 次网络错误自动指数退避重试（最多 2 次）

验收：
- 发一条消息能看到逐字流式输出
- 点击"停止"立即中断
- 关掉网络再发送，UI 显示错误而不是无限 loading
- 配额耗尽时 quota:exhausted 事件被触发（console 验证）
- pnpm typecheck && pnpm lint 通过
```

---

## Agent C · AI 后端 + API 路由

**分支**：`feat/c-api`

```
你是 Agent C（后端）。遵守 docs/AGENTS.md 的通用准入规则。

任务：实现 POST /api/chat，按 MBTI 加载系统 prompt，流式调用 Claude 返回 SSE。

你可写：
- web/app/api/chat/route.ts
- web/lib/claude.ts
- web/lib/prompts.ts（如需抽取 prompt 组装逻辑）

你只读 / 调用：
- web/lib/types.ts（chatRequestSchema、INPUT_LIMITS）
- web/lib/mbti.ts（loadSystemPrompt）
- web/lib/ratelimit.ts（rateLimiter.check）
- web/lib/security.ts（sanitizeUserContent、wrapUserMessage、redact）

必须实现：
1. route.ts：
   - 验证 Content-Type、Origin 同源
   - 解析 JSON → chatRequestSchema.parse（失败返回 400）
   - 提取客户端 IP（x-forwarded-for 或 middleware 注入的 X-Client-IP）
   - await rateLimiter.check(fingerprint, ip) —— 不通过返回 429 + Retry-After
   - 取 messages 最后一条 user，sanitizeUserContent；不安全则返回 400
   - loadSystemPrompt(mbti) → 组装 messages[]
   - 用 streamChat() 取异步迭代器，逐块 encodeSSE 输出
   - meta 事件先推一次 { remaining, limit, resetAt }
   - 正常结束写 encodeDone()
   - AbortController 绑定 req.signal + 30s 超时

2. lib/claude.ts：
   - @anthropic-ai/sdk 客户端，读 process.env.ANTHROPIC_API_KEY
   - 模型选择：tier=free 用 CLAUDE_MODEL_FREE，paid 用 CLAUDE_MODEL_PAID
   - max_tokens = INPUT_LIMITS.maxOutputTokens
   - 启用 system prompt caching（把 system 设为数组 [{type:'text',text,cache_control:{type:'ephemeral'}}]）
   - yield 每个 text_delta
   - 捕获 429/5xx 抛自定义 Error 让 route 转 SSE error

安全：
- **永远**不要在响应里回显 system prompt 或 API key
- 异常只回用户友好短句，详细栈进 console.error
- 日志格式：`[chat] fp=${fp.slice(0,8)} mbti=${mbti} status=${status} ms=${ms}`
- 不要 log 完整 user message

鲁棒性：
- Anthropic SDK 超时设 25s（留 5s 给 SSE flush）
- 流中断时确保上游请求也中断
- 在 try/finally 里清理 controller

验收：
- curl -N -X POST localhost:3000/api/chat -d '{"mbti":"INTJ","messages":[...],"fingerprint":"..."}' 能看到流式输出
- 不合法 mbti 返回 400
- 配额耗尽返回 429 + Retry-After
- 无 ANTHROPIC_API_KEY 时 dev 启动打印警告（不崩溃，route 返回 503）
- pnpm typecheck && pnpm lint 通过
```

---

## Agent D · 限流 + 安全基线

**分支**：`feat/d-security`

```
你是 Agent D（安全）。遵守 docs/AGENTS.md 的通用准入规则。

任务：把 lib/ratelimit.ts 从 in-memory stub 升级为生产可用的限流器，
完善 lib/security.ts 的注入防御，扩展 middleware.ts 的 CSP。

你可写：
- web/lib/ratelimit.ts
- web/lib/security.ts
- web/middleware.ts

你只读：
- web/lib/types.ts（RateLimiter、RateLimitResult 接口）

必须实现：

1. ratelimit.ts：
   - 检测 UPSTASH_REDIS_REST_URL/TOKEN，有则用 Upstash @upstash/ratelimit
     （需加依赖 @upstash/ratelimit + @upstash/redis）
   - 没有则保留 in-memory 降级，**加明显 console.warn** 告知生产不安全
   - 双层限流：
     a. 每 fingerprint 每日 FREE_MESSAGES_PER_DAY（默认 3）
     b. 每 IP 每分钟 10 次（防脚本爆刷）
   - 任一超限即拒绝；返回 RateLimitResult.resetAt 是**更近的那个**
   - 暴露 reset(fingerprint) 供测试清理

2. security.ts：
   - 扩展 INJECTION_PATTERNS 覆盖更多常见变体（中英文各 5 条以上，列清单给用户核对）
   - sanitizeUserContent 在命中时不直接拒绝，而是返回 { safe: false, reason, content }，
     让调用方决定（当前 route 会返回 400，未来可能改为"软拒绝+提示"）
   - 新增 `detectPII(text)`：检测手机号（中国 /1\d{10}/）、邮箱、身份证号前缀，返回命中类型数组
     —— route 未用它，但作为工具留给未来埋点

3. middleware.ts：
   - CSP 根据 NODE_ENV 区分：dev 允许 unsafe-eval（Next dev 需要），prod 收紧
   - 新增 X-Request-ID（crypto.randomUUID）注入响应头方便日志追踪
   - 跳过 /api/health（如未来有）和 _next 静态

鲁棒性：
- Upstash 连接失败时降级到 in-memory 并 console.error（不拒绝请求）
- 限流失败绝不能 block 正常流量 —— fail open 还是 fail closed？
  采用 **fail open** + 告警（console.error），避免把用户锁死

验收：
- 不配 Upstash：console 打出降级警告，行为正常
- 配 Upstash：连续 4 次请求第 4 次被拒
- 同 IP 不同 fingerprint 11 次/分钟第 11 次被拒
- 注入样例（"ignore previous instructions"）被 sanitize 返回 safe:false
- pnpm typecheck && pnpm lint 通过
```

---

## Agent E · 付费 + 留资 + 埋点

**分支**：`feat/e-conversion`

```
你是 Agent E（转化）。遵守 docs/AGENTS.md 的通用准入规则。

任务：做一个配额耗尽时弹出的"加微信 / 付费解锁"对话框 + 埋点封装。

你可写：
- web/components/paywall/**
- web/lib/analytics.ts
- web/public/wechat-qr.png（放一张占位图）

你只读：
- web/lib/types.ts

必须实现：

1. components/paywall/PaywallModal.tsx（"use client"）：
   - 监听 window 的 "quota:exhausted" 事件显示
   - 两个 CTA：
     A. "免费领 16 型 Prompt PDF" → 展示微信二维码（从 NEXT_PUBLIC_WECHAT_QR_URL 读）
     B. "¥29 解锁 30 天" → 跳 NEXT_PUBLIC_STRIPE_PAYMENT_LINK
   - 可关闭（ESC + 右上角 x + 遮罩点击）
   - 关闭时埋点 paywall_dismissed

2. 把 PaywallModal 挂进 app/layout.tsx？
   —— 不！layout 归属公共。你在 app/chat/page.tsx 里挂载会越界。
   正确做法：新建 web/components/paywall/PaywallProvider.tsx，Agent B 的 chat page
   内自行 import 使用。如果 Agent B 还没做完，你挂到 app/chat/page.tsx 附近但
   **只加不改**其他代码（用代码注释标记 Agent E 附加区块）。

3. analytics.ts：
   - 真实实现 PostHog 封装
   - 懒加载 posthog-js（动态 import，避免 SSR 出问题）
   - 环境变量缺失时 no-op + console.warn
   - trackEvent 只接受白名单事件（已在 types 定义）
   - 自动附加 mbti、fingerprint 前 8 位（永远不附 IP、UA 原文）

隐私与安全：
- 微信二维码图片**不要**提交真实的个人码（用占位 PNG），注明要手动替换
- Stripe 链接从环境变量读，不硬编码
- 埋点永远不发送原始 user message 或 AI response

验收：
- 手动触发 window.dispatchEvent(new Event("quota:exhausted")) → 弹窗显示
- ESC 关闭 + 埋点触发
- 未配 POSTHOG_KEY 时 trackEvent 不抛异常
- pnpm typecheck && pnpm lint 通过
```

---

## 合流 checklist（所有 agent 完成后）

1. 按顺序合并：D → C → B → A → E
2. 每次 merge 后在主干跑 `pnpm typecheck && pnpm lint && pnpm build`
3. 手动冒烟：
   - 首页 → 选 MBTI → 对话 → 发一条消息看流式 → 连发 4 次触发 paywall
4. 生产环境变量齐：ANTHROPIC_API_KEY / UPSTASH_* / STRIPE_PAYMENT_LINK / WECHAT_QR
5. Vercel 部署 + 绑定域名
6. 小红书发第一条文案，看数据

祝开发顺利。
