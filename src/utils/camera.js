// 摄像头控制工具
export class CameraController {
  constructor() {
    this.enabled = false
    this.lastSnapshot = null
    this.needFrame = false // 是否需要前端推送图片
  }

  async start() {
    console.log('[Camera] 启动摄像头...')
    this.enabled = true
    return { success: true, message: '摄像头已启动' }
  }

  async stop() {
    console.log('[Camera] 关闭摄像头...')
    this.enabled = false
    return { success: true, message: '摄像头已关闭' }
  }

  async capture() {
    if (!this.enabled) {
      throw new Error('摄像头未启动')
    }
    console.log('[Camera] 捕获画面...')

    // 如果有外部提供的图片，使用外部图片（但排除黑图占位）
    if (this.lastSnapshot?.data && this.lastSnapshot.data !== 'base64_image_data_placeholder') {
      // 检测是否是黑图占位（小于 5KB 的图片通常是无效的）
      const sizeKB = this.lastSnapshot.data.length / 1024
      console.log(`[Camera] 外部图片大小: ${sizeKB.toFixed(1)} KB`)
      if (sizeKB > 5) {
        console.log('[Camera] 使用外部图片')
        return this.lastSnapshot
      } else {
        console.log('[Camera] 外部图片太小（可能是黑图），改用 test.png')
      }
    }

    // 测试模式：加载 test.png
    try {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const testImagePath = path.join(process.cwd(), 'test.png')
      const imageBuffer = await fs.readFile(testImagePath)
      const base64 = imageBuffer.toString('base64')
      console.log('[Camera] 加载测试图片:', base64.length, '字符')
      this.lastSnapshot = {
        timestamp: new Date().toISOString(),
        data: base64
      }
      return this.lastSnapshot
    } catch (err) {
      console.log('[Camera] 无法加载测试图片，使用占位符')
    }

    this.lastSnapshot = {
      timestamp: new Date().toISOString(),
      data: 'base64_image_data_placeholder'
    }
    return this.lastSnapshot
  }

  /**
   * 设置外部提供的图片（由前端捕获）
   */
  setExternalImage(base64Data) {
    console.log('[Camera] 收到前端图片, 长度:', base64Data?.length || 0)
    this.lastSnapshot = {
      timestamp: new Date().toISOString(),
      data: base64Data
    }
    return this.lastSnapshot
  }

  /**
   * 请求前端推送图片（由 cron 触发）
   */
  requestFrame() {
    console.log('[Camera] 请求前端推送图片')
    // 清除旧数据，确保等待新图片
    this.lastSnapshot = null
    this.needFrame = true
    return { needFrame: true }
  }

  /**
   * 获取状态（包含是否需要图片）
   */
  getStatus() {
    return {
      enabled: this.enabled,
      lastSnapshot: this.lastSnapshot,
      hasImage: !!(this.lastSnapshot?.data && this.lastSnapshot.data !== 'base64_image_data_placeholder'),
      needFrame: this.needFrame
    }
  }
}

export const camera = new CameraController()
