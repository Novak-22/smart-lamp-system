# OpenClaw 集成配置指南

## 架构说明

正确的工作流程：

```
1. OpenClaw Cron 触发任务
   ↓
2. 调用本地 API (http://localhost:3001/api/task/execute)
   ↓
3. 本地笔记本：
   - 开启摄像头
   - 抓取图像（base64）
   ↓
4. 上传图像到 OpenClaw
   - 调用 openclaw agent 命令
   - 发送图像 + 分析提示词
   ↓
5. OpenClaw AI 分析：
   - 使用视觉模型分析图像
   - 判断是否在做作业/阅读等
   ↓
6. 返回分析结果到本地
   ↓
7. 本地笔记本：
   - 解析 OpenClaw 响应
   - 如果未在执行任务 → 语音提醒
   - 记录历史
```

## 配置步骤

### 1. 获取 OpenClaw Session ID

有两种方式：

#### 方式A：使用现有的 WhatsApp Session

```bash
# 查看你的 WhatsApp 号码（已在配置中）
# +8618611978067

# 测试发送消息
openclaw agent --to +8618611978067 --message "测试" --json
```

#### 方式B：创建专用 Agent

```bash
# 创建一个专门用于智能台灯的 agent
openclaw agents create --name smart-lamp-agent
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# OpenClaw 配置
OPENCLAW_PHONE=+8618611978067
OPENCLAW_SESSION_ID=your-session-id  # 可选
OPENCLAW_AGENT_ID=your-agent-id      # 可选

# 检测模式
USE_OPENCLAW=true  # true=使用OpenClaw分析, false=模拟检测
```

### 3. 测试 OpenClaw 集成

```bash
# 测试 OpenClaw agent 命令
openclaw agent --to +8618611978067 \
  --message "请分析：图片中的人是否在做作业？请回答：是 或 否" \
  --json
```

预期响应格式：
```json
{
  "reply": "是",
  "session_id": "xxx",
  ...
}
```

### 4. 更新代码配置

编辑 `src/utils/openclaw.js`，设置你的配置：

```javascript
export class OpenClawClient {
  constructor() {
    // 从环境变量读取
    this.phone = process.env.OPENCLAW_PHONE || '+8618611978067'
    this.sessionId = process.env.OPENCLAW_SESSION_ID || null
    this.agentId = process.env.OPENCLAW_AGENT_ID || null
  }
  // ...
}
```

## 当前状态

### ✅ 已实现
- 本地服务框架
- 摄像头控制模块
- OpenClaw 客户端封装
- 降级到模拟检测

### ⚠️ 待完善
1. **真实摄像头集成**
   - 当前返回模拟的 base64 数据
   - 需要集成 `node-webcam` 或 `opencv4nodejs`

2. **OpenClaw 响应解析**
   - 当前使用简单的关键词匹配
   - 需要根据实际响应格式调整

3. **图像上传**
   - OpenClaw agent 命令可能不直接支持图像
   - 可能需要先上传到临时服务器，然后发送链接

## 替代方案

### 方案1：通过 WhatsApp 发送图像

```javascript
// 1. 本地抓取图像
// 2. 保存为临时文件
// 3. 通过 OpenClaw 发送到 WhatsApp
exec(`openclaw send --to +8618611978067 --file ${imagePath}`)

// 4. 发送分析请求
exec(`openclaw agent --to +8618611978067 --message "请分析上面的图片，判断是否在做作业"`)

// 5. 等待并解析回复
```

### 方案2：使用 OpenClaw HTTP API

如果 OpenClaw 提供 HTTP API：

```javascript
const response = await fetch('http://127.0.0.1:18789/api/agent/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    image: base64Image,
    prompt: "判断是否在做作业"
  })
})
```

### 方案3：使用 OpenAI Vision API（如果 OpenClaw 支持）

```javascript
// 如果 OpenClaw 配置了 OpenAI
const prompt = `
请分析这张图片，判断图片中的人是否正在做作业。
图片：[base64_image]
请回答：是 或 否
`

const result = await openclawClient.callAgent(prompt)
```

## 测试命令

```bash
# 1. 测试本地服务
curl -X POST http://localhost:3001/api/task/execute \
  -H 'Content-Type: application/json' \
  -d '{"action":"homework","prompt":"该做作业了！"}'

# 2. 测试 OpenClaw agent
openclaw agent --to +8618611978067 \
  --message "测试消息" \
  --json

# 3. 查看 OpenClaw 日志
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
```

## 故障排查

### OpenClaw agent 调用失败

```bash
# 检查 Gateway 状态
openclaw gateway status

# 检查 WhatsApp 连接
openclaw channels status whatsapp

# 查看日志
openclaw logs
```

### 图像分析不准确

- 确保图像清晰
- 调整提示词
- 增加上下文信息

### 响应解析错误

- 打印完整的 OpenClaw 响应
- 根据实际格式调整解析逻辑

## 下一步

1. 测试 OpenClaw agent 命令的实际响应格式
2. 集成真实摄像头
3. 完善响应解析逻辑
4. 添加错误重试机制
