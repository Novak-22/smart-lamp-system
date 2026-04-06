// 系统状态
import { camera } from '../utils/camera.js'
import { voice } from '../utils/voice.js'
import { history } from '../utils/history.js'

export default {
  method: 'GET',
  path: '/api/status',

  async handler() {
    const cameraStatus = camera.getStatus()
    const voiceHistory = voice.getHistory(5)
    const stats = history.getStats()
    const recentRecords = history.getAll(5)

    return {
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
    }
  }
}
