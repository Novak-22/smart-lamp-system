import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

// 导入工具模块
import { camera } from './src/utils/camera.js'
import { detector } from './src/utils/detector.js'
import { voice } from './src/utils/voice.js'
import { history } from './src/utils/history.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// ==================== API 路由 ====================

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'smart-lamp-system',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// 执行检测任务 - OpenClaw 调用的主要接口
app.post('/api/task/execute', async (req, res) => {
  const { action, prompt, image } = req.body

  if (!action || !prompt) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: action, prompt'
    })
  }

  const startTime = Date.now()
  console.log(`\n[Task] 开始执行任务: ${action}`)

  try {
    // 1. 如果有前端传来的图片，使用它；否则从外部摄像头服务获取
    if (image) {
      camera.setExternalImage(image)
      console.log('[Task] 使用请求体中的图片')
    } else {
      // 从外部摄像头服务获取图片
      console.log('[Task] 从摄像头服务获取图片: http://10.151.112.42:5000/photo')
      try {
        const camRes = await fetch('http://10.151.112.42:5000/photo')
        const camData = await camRes.json()
        if (camData.image) {
          // 去除 base64 头（如果有的话）
          const base64 = camData.image.replace(/^data:image\/\w+;base64,/, '')
          camera.setExternalImage(base64)
          console.log('[Task] 摄像头图片已获取:', base64.length, 'bytes')
        } else {
          throw new Error('摄像头服务返回格式异常: ' + JSON.stringify(camData).slice(0, 100))
        }
      } catch (err) {
        console.error('[Task] 摄像头获取失败:', err.message)
        // 后备：使用 test.png
        await camera.start()
        await camera.capture()
      }
    }

    // 2. AI 检测
    const snapshot = camera.lastSnapshot
    console.log(`[Task] 发送给 Detector 的图片大小: ${snapshot?.data?.length || 0} bytes`)
    const detectionResult = await detector.detect(snapshot.data, action)
    console.log('[Task] 检测完成:', detectionResult.message)

    // 3. 如果未检测到，播放语音提醒
    let voiceResult = null
    if (!detectionResult.detected) {
      voiceResult = await voice.speak(prompt)
      console.log('[Task] 语音提醒已播放')
    }

    // 4. 记录历史
    const record = {
      action,
      detected: detectionResult.detected,
      confidence: detectionResult.confidence,
      message: detectionResult.message,
      voiceSpoken: !detectionResult.detected,
      voiceText: voiceResult?.text,
      duration: Date.now() - startTime
    }
    history.add(record)

    // 5. 关闭摄像头
    await camera.stop()

    const duration = Date.now() - startTime
    console.log(`[Task] 任务完成，耗时 ${duration}ms\n`)

    res.json({
      success: true,
      result: {
        ...record,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('[Task] 任务执行失败:', error)
    await camera.stop()

    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 获取摄像头状态
app.get('/api/camera/status', (req, res) => {
  const status = camera.getStatus()
  res.json({
    success: true,
    camera: status
  })
})

// 接收前端摄像头图片（由前端定时推送）
app.post('/api/camera/frame', async (req, res) => {
  const { image } = req.body

  if (image) {
    // 保存图片到 debug 文件夹
    try {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const debugDir = path.join(process.cwd(), 'debug-frames')
      await fs.mkdir(debugDir, { recursive: true })
      const filename = `frame-${Date.now()}.png`
      // 移除 data:image/png;base64, 前缀如果有的话
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
      await fs.writeFile(path.join(debugDir, filename), Buffer.from(base64Data, 'base64'))
      console.log(`[Camera] 保存调试图片: ${filename} (${base64Data.length} bytes)`)
    } catch (e) {
      console.error('[Camera] 保存调试图片失败:', e.message)
    }

    camera.setExternalImage(image)
    res.json({ success: true, message: '图片已接收' })
  } else {
    res.status(400).json({ success: false, error: '缺少图片数据' })
  }
})

// 前端轮询此端点，检查是否需要推送图片
app.get('/api/camera/need-frame', (req, res) => {
  const status = camera.getStatus()
  if (status.needFrame) {
    // 清除标志，返回需要推送
    camera.needFrame = false
    res.json({ needFrame: true })
  } else {
    res.json({ needFrame: false })
  }
})

// 获取历史记录
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const action = req.query.action

  const records = action
    ? history.getByAction(action, limit)
    : history.getAll(limit)

  const stats = history.getStats()

  res.json({
    success: true,
    records,
    stats,
    total: records.length
  })
})

// 获取系统状态
app.get('/api/status', (req, res) => {
  const cameraStatus = camera.getStatus()
  const voiceHistory = voice.getHistory(5)
  const stats = history.getStats()
  const recentRecords = history.getAll(5)

  res.json({
    success: true,
    status: {
      online: true,
      timestamp: new Date().toISOString(),
      camera: cameraStatus,
      stats,
      recentActivity: {
        detections: recentRecords,
        voiceAlerts: voiceHistory
      }
    }
  })
})

// 首页
app.get('/', (req, res) => {
  const html = readFileSync(join(__dirname, 'public', 'index.html'), 'utf-8')
  res.send(html)
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🔦 智能台灯系统                                      ║
║   基于 OpenClaw 的本地 AI 助手                        ║
║                                                        ║
║   服务地址: http://localhost:${PORT}                     ║
║   监控界面: http://localhost:${PORT}                     ║
║   健康检查: http://localhost:${PORT}/health              ║
║                                                        ║
║   OpenClaw Gateway: http://127.0.0.1:18789            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

📋 下一步操作:

1. 打开浏览器访问监控界面
2. 运行设置脚本: ./openclaw-scripts/setup-cron.sh
3. 或手动测试: ./openclaw-scripts/test-manual.sh

💡 提示: 按 Ctrl+C 停止服务
`)
})
