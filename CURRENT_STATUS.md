# 智能台灯系统 - 当前状态与下一步

## 📊 测试结果

### OpenClaw 集成测试

**发现的问题：**
1. ⚠️ **Rate Limit**: ChatGPT Plus 使用限额已达上限，需等待约47小时
2. ⚠️ **Gateway Pairing**: 需要配对才能使用 Gateway

**好消息：**
✅ OpenClaw 有 **camsnap** skill - 内置摄像头捕获功能！

### 响应格式

OpenClaw agent 返回的 JSON 格式：
```json
{
  "payloads": [
    {
      "text": "AI 的回复文本",
      "mediaUrl": null
    }
  ],
  "meta": {
    "durationMs": 10795,
    "agentMeta": {
      "sessionId": "xxx",
      "provider": "openai-codex",
      "model": "gpt-5.4"
    },
    "stopReason": "error"
  }
}
```

## 🎯 推荐方案

基于发现的 **camsnap** skill，我建议使用以下架构：

### 方案：使用 OpenClaw 的 camsnap + agent

```
1. OpenClaw Cron 触发
   ↓
2. 执行 OpenClaw 命令序列：
   - camsnap 抓取摄像头图像
   - agent 分析图像
   ↓
3. 解析分析结果
   ↓
4. 如果未在执行任务 → 调用本地 API 播放语音
```

### 实现方式

**OpenClaw Cron 任务：**
```bash
openclaw cron add \
  --name "做作业检查" \
  --schedule "0 17 * * *" \
  --command "bash /path/to/check-homework.sh"
```

**check-homework.sh 脚本：**
```bash
#!/bin/bash

# 1. 使用 camsnap 抓取图像
IMAGE_PATH="/tmp/snapshot-$(date +%s).jpg"
openclaw camsnap --output $IMAGE_PATH

# 2. 发送图像到 WhatsApp/飞书
openclaw send --to +8618611978067 --file $IMAGE_PATH

# 3. 请求 OpenClaw 分析
RESPONSE=$(openclaw agent --to +8618611978067 \
  --message "请分析上面的图片，判断是否在做作业。只回答：是 或 否" \
  --json)

# 4. 解析结果
IS_DOING=$(echo $RESPONSE | jq -r '.payloads[0].text')

# 5. 如果未在做作业，调用本地 API 播放语音
if [[ $IS_DOING == *"否"* ]]; then
  curl -X POST http://localhost:3001/api/voice/speak \
    -H 'Content-Type: application/json' \
    -d '{"text":"该做作业了，请专心学习！"}'
fi

# 6. 记录结果
curl -X POST http://localhost:3001/api/history/add \
  -H 'Content-Type: application/json' \
  -d "{\"detected\":false,\"message\":\"$IS_DOING\"}"
```

## 🔧 需要完成的工作

### 1. 解决 Rate Limit（等待或切换模型）

**选项A：等待**
- 等待约47小时后重试

**选项B：切换到其他模型**
```bash
# 查看可用模型
openclaw config get agents.defaults.models

# 切换模型（如果有其他可用的）
openclaw agent --model gpt-5.3-codex --message "测试"
```

### 2. 配置 Gateway Pairing（如果需要）

```bash
# 查看 pairing 状态
openclaw gateway status

# 如果需要配对
openclaw devices pair
```

### 3. 测试 camsnap skill

```bash
# 测试摄像头捕获
openclaw camsnap --output /tmp/test.jpg

# 查看图像
open /tmp/test.jpg
```

### 4. 更新本地服务

添加新的 API 端点：

**POST /api/voice/speak** - 单独的语音播报接口
```javascript
app.post('/api/voice/speak', async (req, res) => {
  const { text } = req.body
  await voice.speak(text)
  res.json({ success: true })
})
```

**POST /api/history/add** - 单独的历史记录接口
```javascript
app.post('/api/history/add', async (req, res) => {
  history.add(req.body)
  res.json({ success: true })
})
```

### 5. 创建完整的检查脚本

创建 `openclaw-scripts/check-task.sh`，整合所有步骤。

## 📝 当前可用功能

### ✅ 已完成并可用
1. 本地服务运行（http://localhost:3001）
2. Web 监控界面
3. 模拟检测模式
4. 历史记录管理
5. OpenClaw 客户端框架

### ⏳ 等待配置
1. OpenClaw Rate Limit 恢复
2. Gateway Pairing（如果需要）
3. camsnap 测试
4. 完整脚本集成

## 🎬 下一步行动

### 立即可做（不需要 OpenClaw AI）

1. **测试 camsnap**
   ```bash
   openclaw camsnap --output /tmp/test.jpg
   open /tmp/test.jpg
   ```

2. **添加新的 API 端点**
   - 语音播报接口
   - 历史记录接口

3. **创建完整的检查脚本**

### 等待 Rate Limit 恢复后

1. **测试完整流程**
   - camsnap 抓图
   - 发送到 WhatsApp
   - agent 分析
   - 解析结果
   - 语音提醒

2. **创建 OpenClaw Cron 任务**

3. **端到端验证**

## 💡 临时方案

在等待 Rate Limit 恢复期间，可以：

1. **使用模拟模式**继续开发和测试本地功能
2. **完善 Web UI**
3. **添加更多功能**（如统计图表、任务管理等）
4. **编写文档**

## 📚 相关文档

- `OPENCLAW_INTEGRATION.md` - OpenClaw 集成详细指南
- `ARCHITECTURE_FIX.md` - 架构修正说明
- `README.md` - 完整项目文档

---

**当前状态**: 框架完成，等待 OpenClaw Rate Limit 恢复以测试完整集成
**预计可测试时间**: 约47小时后
**临时方案**: 使用模拟模式继续开发
