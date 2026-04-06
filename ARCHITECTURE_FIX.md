# 智能台灯系统 - 架构修正说明

## ⚠️ 重要修正

你指出的问题完全正确！之前的架构设计有误。

### ❌ 错误的架构（之前）
```
本地模拟 AI 检测 → 返回结果
```
问题：没有利用 OpenClaw 的 AI 能力

### ✅ 正确的架构（现在）
```
1. 本地抓取摄像头图像
2. 上传图像到 OpenClaw
3. OpenClaw AI 分析图像
4. 返回分析结果
5. 本地根据结果语音提醒
```

## 🔄 已修改的文件

### 1. `src/utils/detector.js`
- 新增 OpenClaw 集成
- 支持两种模式：OpenClaw 分析 / 模拟检测
- 降级机制：OpenClaw 失败时使用模拟

### 2. `src/utils/openclaw.js` (新增)
- OpenClaw 客户端封装
- 调用 `openclaw agent` 命令
- 图像上传和分析
- 响应解析

### 3. `OPENCLAW_INTEGRATION.md` (新增)
- 完整的集成指南
- 配置步骤
- 测试方法
- 故障排查

### 4. `openclaw-scripts/test-openclaw.sh` (新增)
- 测试 OpenClaw 集成
- 验证 agent 命令
- 测试分析提示词

## 🎯 正确的工作流程

```
┌─────────────────────────────────────────────────────────┐
│  用户通过 WhatsApp/飞书 → OpenClaw                      │
│  "每天17:00检查是否在做作业"                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  OpenClaw 创建 cron 任务                                │
│  schedule: "0 17 * * *"                                 │
│  command: curl http://localhost:3001/api/task/execute   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  17:00 触发 → 调用本地 API                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  本地笔记本服务 (localhost:3001)                        │
│  1. 启动摄像头                                          │
│  2. 抓取图像 (base64)                                   │
│  3. 调用 OpenClaw 客户端                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  OpenClaw 客户端                                        │
│  执行: openclaw agent --to +86xxx --message "..."       │
│  发送: 图像 + 分析提示词                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  OpenClaw AI (GPT-5.4)                                  │
│  - 接收图像和提示词                                     │
│  - 使用视觉模型分析                                     │
│  - 判断是否在做作业                                     │
│  - 返回：是 / 否                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  本地笔记本解析结果                                     │
│  - 如果"否" → 播放语音提醒                              │
│  - 记录历史                                             │
│  - 返回结果                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  OpenClaw 通知用户 (WhatsApp/飞书)                      │
│  "检测完成：未发现做作业，已语音提醒"                   │
└─────────────────────────────────────────────────────────┘
```

## 📋 待完成的集成步骤

### 步骤1：测试 OpenClaw Agent

```bash
./openclaw-scripts/test-openclaw.sh
```

这会：
- 测试 OpenClaw Gateway 连接
- 发送测试消息到你的 WhatsApp
- 测试分析提示词

### 步骤2：查看 OpenClaw 响应格式

运行测试后，查看实际的响应格式：
```bash
openclaw agent --to +8618611978067 \
  --message "测试" \
  --json
```

根据响应格式，调整 `src/utils/openclaw.js` 中的 `parseAgentResponse` 方法。

### 步骤3：集成真实摄像头

安装摄像头库：
```bash
npm install node-webcam
# 或
npm install opencv4nodejs
```

更新 `src/utils/camera.js`：
```javascript
import NodeWebcam from 'node-webcam'

async capture() {
  return new Promise((resolve, reject) => {
    const webcam = NodeWebcam.create()
    webcam.capture("snapshot", (err, data) => {
      if (err) reject(err)
      // data 是图像的 base64 或文件路径
      resolve({ data, timestamp: new Date().toISOString() })
    })
  })
}
```

### 步骤4：完善图像上传

OpenClaw agent 命令可能不直接支持 base64 图像，需要：

**选项A：保存为文件后发送**
```javascript
// 保存图像
writeFileSync('/tmp/snapshot.jpg', imageBuffer)

// 通过 OpenClaw 发送文件
exec(`openclaw send --to +86xxx --file /tmp/snapshot.jpg`)

// 发送分析请求
exec(`openclaw agent --to +86xxx --message "请分析上面的图片..."`)
```

**选项B：上传到临时服务器**
```javascript
// 上传到图床或临时服务器
const imageUrl = await uploadImage(imageData)

// 发送链接给 OpenClaw
exec(`openclaw agent --to +86xxx --message "请分析这张图片：${imageUrl}，判断是否在做作业"`)
```

## 🧪 当前测试状态

### ✅ 可以测试的功能
1. 本地服务运行
2. 摄像头控制（模拟）
3. 历史记录
4. Web 监控界面
5. OpenClaw cron 任务创建

### ⚠️ 需要配置的功能
1. OpenClaw agent 调用
2. 图像上传方式
3. 响应解析逻辑
4. 真实摄像头集成

## 🔧 快速测试

### 测试1：模拟模式（当前可用）
```bash
# 使用模拟检测
curl -X POST http://localhost:3001/api/task/execute \
  -H 'Content-Type: application/json' \
  -d '{"action":"homework","prompt":"该做作业了！"}'
```

### 测试2：OpenClaw 集成（需要配置）
```bash
# 1. 测试 OpenClaw 连接
./openclaw-scripts/test-openclaw.sh

# 2. 查看响应格式
openclaw agent --to +8618611978067 --message "测试" --json

# 3. 根据响应格式调整代码
# 编辑 src/utils/openclaw.js

# 4. 重启服务测试
npm run dev
```

## 📚 相关文档

- `OPENCLAW_INTEGRATION.md` - OpenClaw 集成详细指南
- `README.md` - 项目完整文档
- `QUICKSTART.md` - 快速启动指南

## 💡 建议

1. **先测试 OpenClaw agent 命令**，了解实际的响应格式
2. **确定图像上传方式**（文件 vs URL）
3. **集成真实摄像头**
4. **完善响应解析**
5. **添加错误处理和重试机制**

---

**当前状态**: 架构已修正，OpenClaw 集成框架已就绪，等待配置和测试
