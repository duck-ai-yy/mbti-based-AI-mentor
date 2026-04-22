# 安全与鲁棒性基线

所有 agent 提交代码前过一遍这个清单。

## 威胁模型

| 威胁 | 影响 | 对策 | 负责人 |
|---|---|---|---|
| Claude API Key 泄露 | 账单爆炸 | 只在 server 端读 `process.env`，从不写入客户端 bundle | C、D |
| Prompt 注入（用户让 AI 忽略 system） | 人设漂移、输出敏感内容 | `sanitizeUserContent` + `wrapUserMessage` | D |
| 刷量滥用（免费额度） | API 成本 | 指纹 + IP 双维度限流，日上限 | D |
| XSS（AI 输出渲染） | 盗 cookie | 永远用 React 文本渲染，不 `dangerouslySetInnerHTML` | B |
| SSRF / 路径穿越（读取 prompt 文件时） | 读到不该读的文件 | `lib/mbti.ts` 已用白名单 enum + 硬编码路径 | 已做 |
| CSRF | 被第三方站触发 API | 仅接受 `Content-Type: application/json`、同源 CORS | C |
| 超长请求拖垮 serverless | 预算 + 超时 | `next.config.mjs` bodyLimit 1mb + `INPUT_LIMITS.requestTimeoutMs` | C |
| 个人信息进日志 | 合规风险 | `redact()` 包装，禁止 log 完整 message | 所有人 |

## 必做清单

### 后端（Agent C）
- [ ] Zod `chatRequestSchema.parse()` 在任何业务逻辑前
- [ ] `AbortController` 超时 30s，提前断流释放资源
- [ ] Claude API 错误 → 返回**通用**错误文案，不透传内部堆栈
- [ ] 同一 fingerprint 并发 > 1 时拒绝（避免开多标签刷）
- [ ] `max_tokens` 硬顶 `INPUT_LIMITS.maxOutputTokens`
- [ ] 记录：fingerprint（前 8 位）、mbti、tokens、latency — **不记 message 内容**

### 安全（Agent D）
- [ ] Upstash Redis 配置时走 Redis，否则降级 in-memory（写注释告知生产必须配）
- [ ] 限流 429 响应带 `Retry-After` header
- [ ] 注入检测 false positive 时，记录 `redact(content)` 而不是原文
- [ ] `middleware.ts` 的 CSP 随 Agent E 接入第三方脚本同步更新

### 前端（Agent A、B、E）
- [ ] 永不在 client 组件里读 `process.env.ANTHROPIC_*`
- [ ] AI 输出用 `<div>{text}</div>` 而不是 `dangerouslySetInnerHTML`
- [ ] `<Link>` 而不是 `<a href>` 用于内部路由
- [ ] 对外跳转（Stripe、微信）用 `rel="noopener noreferrer"`
- [ ] 用户上传/输入有 `maxLength` 对齐 `INPUT_LIMITS`

## 鲁棒性清单

- [ ] 所有 `fetch()` 有超时 + `try/catch`
- [ ] 流式渲染在 `finally` 里清理 reader
- [ ] UI 有 `loading`、`error`、`empty` 三态
- [ ] Claude 报 429/5xx 时，前端显示"稍后再试"而不是白屏
- [ ] `.env` 缺失时，dev 启动打印清晰 warning 但不崩溃
- [ ] 生产 build 不带 console.log（ESLint 规则已启用）

## 禁忌

- ❌ 用 `eval`、`new Function`、动态 `import()` 处理用户输入
- ❌ 在 server action 里直接拼 SQL / shell
- ❌ 在客户端生成 API key
- ❌ 把 Claude 原始响应对象 JSON.stringify 回客户端
- ❌ `any` 类型（ESLint 警告即需说明）
