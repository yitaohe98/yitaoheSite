---
title: "一个评论框，怎么变成了一套后端系统"
date: 2026-07-25
description: "一个简单的留言板，如何在静态 Hugo 网站旁边逐步长出 API、数据库、安全控制和运维流程。"
primary_category: "系统设计"
categories: ["系统设计"]
tags: ["Cloudflare", "Hugo", "D1", "Pages Functions"]
draft: false
translationKey: "comment-box-backend-system"
---

我一开始只是想在个人网站上加一个评论区。最后页面上仍然只有姓名、留言和评论列表，但它们中间已经是一套小型后端系统。

## 第一个变化是引入状态

这个网站原本由 Hugo 生成静态文件。每次部署只是替换 HTML、CSS 和 JavaScript，网站本身不保存运行时状态。

评论打破了这个前提：访客要写入数据，数据要跨部署保留，其他人还要能够读取。第一个设计问题因此不是表单怎么写，而是可变状态放在哪里。

我保留了 Hugo 的静态边界，只增加一个动态入口：

```text
Browser
  → POST /api/comments
  → Cloudflare Pages Function
  → validation and moderation
  → D1

Browser
  → GET /api/comments
  → Cloudflare Pages Function
  → approved rows from D1
```

只有 `/api/*` 会执行服务端代码。页面和文章仍然是静态内容，评论则独立保存在 D1，不受 Hugo rebuild 或网站部署影响。

这样不需要为了一个留言板再维护独立 application server。Pages Functions 提供 API 边界，D1 负责持久化，动态范围被限制在一个很小的区域。

## 匿名提交决定了防滥用方式

个人留言板没有必要要求注册。提交内容只有公开的 display name 和 comment body，但后端仍然需要区分正常使用和重复提交。

最终的请求链路用了几层职责不同的控制：

- Turnstile token 必须在服务端验证。
- 后端用 keyed hash 从网络信息生成匿名的 rate-limit identity，不保存原始 IP。
- D1 记录 minute bucket，限制短时间内的重复提交。
- honeypot 处理简单脚本。
- 在调用外部服务前检查输入长度和 request size。
- 数据库写入使用 prepared statements。
- 用户内容只按纯文本渲染，不执行 HTML。

这些机制单独看都不完整，组合起来才覆盖 bot、重复提交、注入和内容渲染等不同问题，同时不需要建立用户账户体系。

## Moderation 不是一个 boolean

最初的想法很简单：AI 判断 `safe` 或 `unsafe`，然后发布或拒绝。实际测试后，流程多了两个状态。

首先，AI safety classifier 不等于 civility filter。直接的人身攻击即使带有脏话，也可能不属于模型定义的安全风险。最终实现先运行一组范围较窄的 deterministic rules，处理常见的中英文 targeted abuse；没有命中的内容再交给 Workers AI，避免把所有包含敏感词的正常讨论一并拦截。

其次，外部模型可能 timeout，也可能返回无法识别的结果。失败时自动发布会让服务可用性影响内容安全；直接丢弃又会损失正常留言。

所以 API 使用明确的状态：

- `approved`：审核通过，对外可见。
- `pending`：translation 或 moderation 没有可靠完成，只保存在后台。
- `hidden`：从公开列表隐藏，但仍可恢复。
- 明确不安全的内容：直接拒绝，不保存正文。

中文留言会临时翻译成英文用于 moderation，但 translation 不会写入数据库，原文才是公开记录。

```text
Turnstile
  → rate limit
  → deterministic abuse checks
  → optional translation
  → AI moderation
  → approved, pending, or rejected
```

这里需要区分的是内容判断和系统故障，而不只是保留一个 `true` 或 `false`。

## 读取和运维反过来影响数据模型

公开 API 只返回 `approved` 且未隐藏的评论，不暴露 moderation result、review flag、删除信息或 rate-limit identity。

分页使用由最后一条记录的创建时间和 ID 组成的 opaque cursor。两个字段一起排序，可以处理时间相同的记录；新评论插入时，也不会像 offset pagination 那样移动已有分页边界。

删除同样分成不同操作。Hide 会记录状态和删除时间，之后可以 restore；只有确认不再需要恢复时才 permanent delete。备份是另一份数据，因此从 D1 删除一条记录，并不代表它已经从旧 SQL export 中消失。

这些选择最终形成了一套最小运维接口：查看 `pending`、按 ID approve、hide 或 restore、导出数据库，并先在非生产 D1 上验证 restore。

## 部署配置也是系统的一部分

代码提交后，Pages 环境还需要：

- 已执行 comments migration 的 D1 database；
- 名为 `COMMENTS_DB` 的 D1 binding；
- 名为 `AI` 的 Workers AI binding；
- 加密保存的 Turnstile 和 rate-limit secrets；
- Hugo build 时注入的公开 Turnstile site key。

Preview 和 Production 的 bindings、variables 是分开的。本地测试成功，并不能证明 branch preview 或生产环境拥有同样的 runtime 能力。

第一次 Preview build 就暴露了一个更基础的差异：本地 Hugo 比 Cloudflare 默认版本新，template 中一个本地可用的字段在 Pages 上直接构建失败。最后在 Preview 和 Production 都固定 `HUGO_VERSION`，让构建环境成为显式配置。

数据库也有自己的生命周期。Schema migration 不属于 Hugo build；回滚网站代码时，也不应该顺手删除 D1。旧版本的静态网站可以暂时不用这些表，数据仍然保留。

## 页面仍然很简单

公开输入带来了 state，匿名提交带来了 abuse controls，自动审核带来了 failure states，持久化数据又带来了部署和维护。

最终页面还是一个简单留言板，只是静态网站旁边多了一条范围明确的动态边界。
