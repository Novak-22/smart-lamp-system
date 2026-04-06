// AI 视觉检测工具 - 通过 OpenClaw 进行分析
import { openclawClient } from './openclaw.js'

export class Detector {
  constructor() {
    this.useOpenClaw = true // 是否使用 OpenClaw 分析
  }

  async detect(imageData, action) {
    console.log(`[Detector] 开始检测: ${action}`)

    const actionNames = {
      homework: '做作业',
      reading: '阅读',
      exercise: '运动',
      rest: '休息'
    }

    const actionName = actionNames[action] || action

    if (this.useOpenClaw) {
      try {
        // 调用 OpenClaw 进行图像分析
        const result = await this.analyzeWithOpenClaw(imageData, action, actionName)
        console.log(`[Detector] OpenClaw 分析完成`)
        return result
      } catch (error) {
        console.error(`[Detector] OpenClaw 分析失败，使用模拟检测:`, error.message)
        // 降级到模拟检测
        return this.simulateDetection(action, actionName)
      }
    } else {
      return this.simulateDetection(action, actionName)
    }
  }

  async analyzeWithOpenClaw(imageData, action, actionName) {
    // 保存发送给 OpenClaw 的图片用于调试
    try {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const debugDir = path.join(process.cwd(), 'debug-frames')
      await fs.mkdir(debugDir, { recursive: true })
      const filename = `to-openclaw-${action}-${Date.now()}.png`
      await fs.writeFile(path.join(debugDir, filename), Buffer.from(imageData, 'base64'))
      console.log(`[Detector] 保存 OpenClaw 图片: ${filename} (${imageData.length} bytes)`)
    } catch (e) {
      console.error('[Detector] 保存 OpenClaw 图片失败:', e.message)
    }

    // 构建提示词
    const prompt = `请分析这张摄像头图片，判断图片中的人是否正在${actionName}。

分析要点：
- 如果是"做作业"：看是否在书桌前、手持笔或书本、专注看书写字
- 如果是"阅读"：看是否手持书籍或电子阅读器、专注阅读
- 如果是"运动"：看是否在运动、锻炼身体
- 如果是"休息"：看是否在休息、放松

请直接回答：是 或 否`

    // 调用 OpenClaw
    const openclawResult = await openclawClient.analyzeImage(imageData, prompt)

    return {
      detected: openclawResult.detected,
      action,
      actionName,
      confidence: openclawResult.confidence,
      timestamp: new Date().toISOString(),
      message: openclawResult.detected
        ? `检测到正在${actionName}`
        : `未检测到${actionName}行为`,
      source: 'openclaw',
      rawResponse: openclawResult.rawResponse
    }
  }

  simulateDetection(action, actionName) {
    // 模拟 AI 检测
    const detected = Math.random() > 0.5

    return {
      detected,
      action,
      actionName,
      confidence: detected ? 0.85 : 0.15,
      timestamp: new Date().toISOString(),
      message: detected
        ? `检测到正在${actionName}`
        : `未检测到${actionName}行为`,
      source: 'simulated' // 标记为模拟结果
    }
  }

  /**
   * 切换检测模式
   */
  setMode(useOpenClaw) {
    this.useOpenClaw = useOpenClaw
    console.log(`[Detector] 检测模式: ${useOpenClaw ? 'OpenClaw' : '模拟'}`)
  }
}

export const detector = new Detector()
