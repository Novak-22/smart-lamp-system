import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import mqtt from 'mqtt'
import { randomUUID } from 'crypto'

// 导入工具模块
import { camera } from './src/utils/camera.js'
import { detector } from './src/utils/detector.js'
import { voice } from './src/utils/voice.js'
import { history } from './src/utils/history.js'

// ==================== 智能台灯 MQTT 配置 ====================
const LAMP_AUTH_TOKEN = process.env.SMART_LAMP_AUTH_TOKEN || 'eyJhbGciOiJIUzUxMiJ9.eyJhcHAiOiJMSUdIVF9BUFAiLCJzdWIiOm51bGwsInJvbGUiOiJVU0VSIiwiaGVhZEltZyI6bnVsbCwiY3JlYXRlZCI6MTc3NTUzOTY1MTA2MSwic291cmNlIjoiQVBQIiwidmVyc2lvbiI6MzcyMDMzMzcwMjQ4NzAxNTQyNSwibmFtZSI6bnVsbCwiaWQiOiI0ODMxNDIzNzI1ODQzMzQ1ODY0IiwidXNlclR5cGUiOiJVU0VSIiwiZW5jIjp0cnVlLCJleHAiOjE3NzYxNDQ0NTEsInN0YXR1cyI6IkFDVElWRSJ9.acOBmrCc0RfJEXzPUBXuIlGLkQG5y5eFLV_36_rx-32Qmz4BJi6RY_HBypApe5SGHpc4xJ06gnFSpxwefjczkQ';
const LAMP_DEVICE_ID = 'SCCHI-f8e19ced467d77a1eba05f4246e2f8cc';
const LAMP_SIGNAL_TOPIC = `senselink/company/1/device/${LAMP_DEVICE_ID}/signal`;
const LAMP_URL = `wss://sensejupiter-test.sensetime.com/mqtt4?authToken=${encodeURIComponent(LAMP_AUTH_TOKEN)}`;

// 台灯状态（内存中维护）
let lampBrightness = 2;   // 0-4
let lampTemperature = 5;  // 0-10
let lampVolume = 5;        // 0-10
let lampIsOn = false;

// MQTT 客户端（单例）
let mqttClient = null;

function getMqttClient() {
  if (!mqttClient) {
    mqttClient = mqtt.connect(LAMP_URL, {
      protocolId: 'MQTT',
      protocolVersion: 4,
      connectTimeout: 10000,
      keepalive: 30,
      clean: true,
      clientId: `lamp_server_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      rejectUnauthorized: false,
    });
    mqttClient.on('error', (err) => console.error('[Lamp MQTT] error:', err.message));
  }
  return mqttClient;
}

function buildLampMsg(event, value) {
  return {
    timestamp: Math.floor(Date.now() / 1000),
    seq: randomUUID(),
    signal: 7,
    data: { event, value }
  };
}

function publishLamp(msg) {
  return new Promise((resolve, reject) => {
    getMqttClient().publish(LAMP_SIGNAL_TOPIC, JSON.stringify(msg), { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

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

// ==================== 智能台灯 API ====================

// GET /api/lamp/status - 获取台灯状态
app.get('/api/lamp/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isOn: lampIsOn,
      brightness: lampBrightness,
      temperature: lampTemperature,
      volume: lampVolume,
      brightnessRange: [0, 4],
      temperatureRange: [0, 10],
      volumeRange: [0, 10]
    }
  });
});

// POST /api/lamp/switch - 开关灯
app.post('/api/lamp/switch', async (req, res) => {
  const { on } = req.body;
  const value = on ? 1 : 0;
  lampIsOn = !!on;

  try {
    await publishLamp(buildLampMsg('switch_device_onoff', value));
    res.json({ success: true, message: on ? '灯已打开' : '灯已关闭', isOn: lampIsOn });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lamp/brightness - 调节亮度
app.post('/api/lamp/brightness', async (req, res) => {
  const { action, value, temperature } = req.body;

  if (action === 'up') {
    lampBrightness = Math.min(4, lampBrightness + 1);
  } else if (action === 'down') {
    lampBrightness = Math.max(0, lampBrightness - 1);
  } else if (action === 'set') {
    lampBrightness = Math.max(0, Math.min(4, parseInt(value, 10) || 0));
  } else {
    return res.status(400).json({ success: false, error: 'action must be: up, down, set' });
  }

  if (temperature !== undefined) {
    lampTemperature = Math.max(0, Math.min(10, parseInt(temperature, 10)));
  }

  try {
    await publishLamp(buildLampMsg('adjust_brightness', {
      brightness_mode: 1,
      brightness: lampBrightness,
      temperature: lampTemperature
    }));
    res.json({
      success: true,
      message: `亮度已调整为 ${lampBrightness}`,
      brightness: lampBrightness,
      temperature: lampTemperature
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lamp/temperature - 调节色温
app.post('/api/lamp/temperature', async (req, res) => {
  const { value } = req.body;
  lampTemperature = Math.max(0, Math.min(10, parseInt(value, 10) || 0));

  try {
    await publishLamp(buildLampMsg('adjust_brightness', {
      brightness_mode: 1,
      brightness: lampBrightness,
      temperature: lampTemperature
    }));
    res.json({
      success: true,
      message: `色温已调整为 ${lampTemperature}`,
      temperature: lampTemperature
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lamp/volume - 调节音量
app.post('/api/lamp/volume', async (req, res) => {
  const { action, value } = req.body;

  if (action === 'up') {
    lampVolume = Math.min(10, lampVolume + 1);
  } else if (action === 'down') {
    lampVolume = Math.max(0, lampVolume - 1);
  } else if (action === 'set') {
    lampVolume = Math.max(0, Math.min(10, parseInt(value, 10) || 0));
  } else {
    return res.status(400).json({ success: false, error: 'action must be: up, down, set' });
  }

  try {
    await publishLamp(buildLampMsg('adjust_volume', lampVolume));
    res.json({
      success: true,
      message: `音量已调整为 ${lampVolume}`,
      volume: lampVolume
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 原有 API ====================

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
