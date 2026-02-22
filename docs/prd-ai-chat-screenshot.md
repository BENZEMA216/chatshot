# PRD: AI Chat Screenshot - Chrome Extension

## 1. Problem Statement

当前用户在使用 ChatGPT、豆包、Kimi、Claude、DeepSeek 等 AI 聊天工具时，经常需要将对话内容分享给他人。现有方式存在以下痛点：

- **复制粘贴**：LLM 回答通常很长，包含代码块、表格、公式等富文本格式，复制后格式丢失严重
- **分享链接**：对方可能无法访问（网络限制、需要登录、链接过期）
- **系统截图**：回答内容超出一屏，需要多次截图再拼接，操作繁琐
- **录屏**：文件太大，不便于快速分享

## 2. Product Vision

一键将任意 AI 聊天平台的对话内容（问题+回答）截取为一张完整的长图，方便用户通过微信、钉钉、飞书等即时通讯工具快速分享。

## 3. Target Users

- 日常使用 AI 工具的知识工作者
- 需要频繁分享 AI 回答给同事/朋友的用户
- AI 工具测评/对比的内容创作者
- 团队内部知识沉淀的管理者

## 4. Supported Platforms (P0)

| 平台 | 域名 | 优先级 |
|------|------|--------|
| ChatGPT | chat.openai.com / chatgpt.com | P0 |
| Claude | claude.ai | P0 |
| 豆包 (Doubao) | doubao.com | P0 |
| Kimi | kimi.moonshot.cn | P0 |
| DeepSeek | chat.deepseek.com | P0 |
| 通义千问 | tongyi.aliyun.com | P1 |
| 文心一言 | yiyan.baidu.com | P1 |
| Gemini | gemini.google.com | P1 |
| Perplexity | perplexity.ai | P2 |
| Poe | poe.com | P2 |

## 5. Core Features

### 5.1 一键截图 (P0)

**触发方式：**
- 浏览器工具栏图标点击
- 快捷键 `Ctrl/Cmd + Shift + S`
- 右键菜单 "截取对话"

**截图模式：**

| 模式 | 说明 |
|------|------|
| **整段对话** | 截取当前可见的完整一轮 Q&A（默认） |
| **选择对话** | 用户点击选择要截取的对话轮次（支持多选） |
| **全部对话** | 截取当前会话的所有对话内容 |

**截图行为：**
- 自动识别页面中的对话容器（问题 + 回答）
- 生成一张完整的长图，无论内容多长都不截断
- 保留富文本格式：代码块高亮、表格、列表、LaTeX 公式、图片
- 截图底部自动添加水印：平台名称 + 时间戳（可配置关闭）

### 5.2 截图后操作 (P0)

截图完成后弹出预览浮窗，提供以下操作：

- **复制到剪贴板** — 直接粘贴到微信/钉钉/飞书（默认操作）
- **保存为图片** — PNG 格式下载到本地
- **快速分享** — 生成临时图片链接（7天有效），复制链接即可分享

### 5.3 截图美化 (P1)

- 主题选择：亮色 / 暗色 / 跟随原页面
- 背景样式：纯色 / 渐变 / 透明
- 圆角 & 阴影：可配置的外观美化
- 自定义水印：支持文字水印或关闭

### 5.4 批量管理 (P2)

- 截图历史记录（本地存储）
- 按平台 / 日期筛选
- 批量导出

## 6. Technical Architecture

```
┌─────────────────────────────────────────┐
│           Chrome Extension              │
├──────────┬──────────┬───────────────────┤
│ Popup UI │ Options  │   Content Script  │
│ (React)  │  Page    │  (per chatbot)    │
├──────────┴──────────┴───────────────────┤
│            Background Service Worker     │
├─────────────────────────────────────────┤
│  Core Modules:                          │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ │
│  │Platform  │ │Screenshot│ │ Image    │ │
│  │Adapter   │ │Engine    │ │Processing│ │
│  │Manager   │ │(html2c)  │ │& Export  │ │
│  └─────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```

### 关键技术选型

| 模块 | 方案 | 理由 |
|------|------|------|
| 截图引擎 | `html2canvas` + DOM Clone | 客户端渲染，无需服务端 |
| 平台适配 | Adapter Pattern（每个平台一个适配器） | 各平台 DOM 结构不同，需独立解析 |
| 代码高亮 | 保留原页面样式 | 截图时克隆原始 DOM 样式 |
| 图片存储 | Chrome Storage API + IndexedDB | 本地优先，保护隐私 |
| 分享链接 | 可选的云端上传（用户授权） | 轻量级图床服务 |

### Platform Adapter 设计

每个支持的平台实现统一接口：

```typescript
interface PlatformAdapter {
  platformName: string;
  matchUrl(url: string): boolean;
  getConversationContainer(): HTMLElement;
  getMessagePairs(): MessagePair[];
  enableSelectionMode(): void;
  getSelectedMessages(): MessagePair[];
}

interface MessagePair {
  question: HTMLElement;
  answer: HTMLElement;
  timestamp?: string;
}
```

## 7. MVP Scope (V1.0)

**Include:**
- 支持 ChatGPT + Claude + 豆包 三个平台
- 一键截取当前最近一轮对话
- 复制到剪贴板 + 保存为 PNG
- 快捷键触发
- 基础水印（平台名 + 时间）

**Exclude:**
- 选择模式 / 全部对话模式 → V1.1
- 截图美化 → V1.2
- 分享链接 → V1.3
- 截图历史管理 → V2.0

## 8. Non-Functional Requirements

| 维度 | 要求 |
|------|------|
| **性能** | 单轮对话截图 < 2秒，全部对话截图 < 10秒 |
| **图片质量** | 2x 分辨率，文字清晰可读 |
| **图片大小** | 单张图片 < 5MB（自动压缩） |
| **隐私** | 默认纯本地处理，不上传任何对话内容；分享链接为 opt-in |
| **兼容性** | Chrome 110+，Edge 110+ |
| **离线** | 截图 & 保存功能完全离线可用 |
