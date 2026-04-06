// 执行检测任务 - OpenClaw 调用的主要接口
import { camera } from '../utils/camera.js'
import { detector } from '../utils/detector.js'
import { voice } from '../utils/voice.js'
import { history } from '../utils/history.js'

export default {
  method: 'POST',
  path: '/api/task/execute',

  input: {
    type: 'object',
    properties: {
      action: { type: 'string' },
      prompt: { type: 'string' }
    },
    required: ['action', 'prompt']
  },

  async handler({ input }) {
    const startTime = Date.now()
    console.log(`\n[Task] 开始执行任务: ${input.action}`)

    try {
      // 1. 启动摄像头
      await camera.start()
      console.log('[Task] 摄像头已启动')

      // 2. 等待摄像头稳定
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 3. 捕获画面
      const snapshot = await camera.capture()
      console.log('[Task] 画面已捕获')

      // 4. AI 检测
      const detectionResult = await detector.detect(snapshot.data, input.action)
      console.log('[Task] 检测完成:', detectionResult.message)

      // 5. 如果未检测到，播放语音提醒
      let voiceResult = null
      if (!detectionResult.detected) {
        voiceResult = await voice.speak(input.prompt)
        console.log('[Task] 语音提醒已播放')
      }

      // 6. 记录历史
      const record = {
        action: input.action,
        detected: detectionResult.detected,
        confidence: detectionResult.confidence,
        message: detectionResult.message,
        voiceSpoken: !detectionResult.detected,
        voiceText: voiceResult?.text,
        duration: Date.now() - startTime
      }
      history.add(record)

      // 7. 关闭摄像头
      await camera.stop()

      const duration = Date.now() - startTime
      console.log(`[Task] 任务完成，耗时 ${duration}ms\n`)

      return {
        success: true,
        result: {
          ...record,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('[Task] 任务执行失败:', error)
      await camera.stop()

      return {
        success: false,
        error: error.message
      }
    }
  }
}
