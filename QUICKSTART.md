# 快速启动指南

## 🚀 5分钟快速体验

### 1. 启动服务

```bash
cd smart-lamp-system
npm install  # 首次运行需要
npm run dev
```

看到以下输出表示启动成功：
```
╔════════════════════════════════════════════════════════╗
║   🔦 智能台灯系统                                      ║
║   服务地址: http://localhost:3001                     ║
╚════════════════════════════════════════════════════════╝
```

### 2. 打开监控界面

浏览器访问：http://localhost:3001

### 3. 测试功能

#### 方式一：使用测试脚本（推荐）

```bash
./openclaw-scripts/test-manual.sh
```

选择场景，立即看到检测结果。

#### 方式二：直接调用 API

```bash
curl -X POST http://localhost:3001/api/task/execute \
  -H 'Content-Type: application/json' \
  -d '{"action":"homework","prompt":"该做作业了！"}'
```

### 4. 集成 OpenClaw

#### 快速设置（推荐）

```bash
./openclaw-scripts/setup-cron.sh
```

按提示选择任务类型，自动创建 OpenClaw cron 任务。

#### 手动创建任务

```bash
# 每天 17:00 检查做作业
openclaw cron add \
  --name "做作业检查" \
  --schedule "0 17 * * *" \
  --command "curl -X POST http://localhost:3001/api/task/execute -H 'Content-Type: application/json' -d '{\"action\":\"homework\",\"prompt\":\"该做作业了，请专心学习！\"}'"
```

#### 立即测试任务

```bash
openclaw cron run "做作业检查"
```

### 5. 查看结果

- **Web 界面**: http://localhost:3001
- **API 查询**: `curl http://localhost:3001/api/history`
- **OpenClaw 历史**: `openclaw cron runs "做作业检查"`

## 📱 通过 WhatsApp/飞书控制

你的 OpenClaw 已配置 WhatsApp 和飞书，可以直接对话：

```
你: "帮我设置每天下午5点检查是否在做作业"

OpenClaw: [创建 cron 任务]
"已设置，每天17:00会自动检查"

[17:00 到达]
OpenClaw: "检测完成：未发现做作业，已语音提醒"
```

## 🔧 常用命令

```bash
# 查看所有 OpenClaw 任务
openclaw cron list

# 删除任务
openclaw cron rm "做作业检查"

# 禁用/启用任务
openclaw cron disable "做作业检查"
openclaw cron enable "做作业检查"

# 查看任务执行历史
openclaw cron runs "做作业检查"

# 查看服务状态
curl http://localhost:3001/api/status
```

## 🎯 示例场景

### 场景1：学习监督

```bash
# 每天 17:00-21:00 每小时检查一次
openclaw cron add --name "学习检查-17点" --schedule "0 17 * * *" \
  --command "curl -X POST http://localhost:3001/api/task/execute -H 'Content-Type: application/json' -d '{\"action\":\"homework\",\"prompt\":\"该做作业了！\"}'"

openclaw cron add --name "学习检查-18点" --schedule "0 18 * * *" \
  --command "curl -X POST http://localhost:3001/api/task/execute -H 'Content-Type: application/json' -d '{\"action\":\"homework\",\"prompt\":\"继续加油！\"}'"
```

### 场景2：阅读习惯

```bash
# 每天晚上 20:00 阅读提醒
openclaw cron add --name "阅读时间" --schedule "0 20 * * *" \
  --command "curl -X POST http://localhost:3001/api/task/execute -H 'Content-Type: application/json' -d '{\"action\":\"reading\",\"prompt\":\"该阅读了，养成好习惯！\"}'"
```

### 场景3：午休提醒

```bash
# 工作日 14:00 午休检查
openclaw cron add --name "午休时间" --schedule "0 14 * * 1-5" \
  --command "curl -X POST http://localhost:3001/api/task/execute -H 'Content-Type: application/json' -d '{\"action\":\"rest\",\"prompt\":\"该午休了，休息一下吧！\"}'"
```

## 🐛 故障排查

### 服务无法启动

```bash
# 检查端口占用
lsof -i :3001

# 查看错误日志
npm run dev
```

### OpenClaw 无法连接

```bash
# 检查 OpenClaw Gateway
openclaw gateway status

# 检查本地服务
curl http://localhost:3001/health
```

### 任务不执行

```bash
# 查看任务列表
openclaw cron list

# 手动触发测试
openclaw cron run "任务名称"

# 查看执行历史
openclaw cron runs "任务名称"
```

## 💡 提示

- 服务默认端口 3001，可通过环境变量 `PORT` 修改
- 检测逻辑为模拟实现（50%随机），可扩展真实 AI 模型
- 历史记录保存在内存中，重启后清空
- 建议在本地网络环境使用，保护隐私

## 📚 更多信息

查看完整文档：[README.md](README.md)
