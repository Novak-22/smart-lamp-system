// 获取摄像头状态
import { camera } from '../utils/camera.js'

export default {
  method: 'GET',
  path: '/api/camera/status',

  async handler() {
    const status = camera.getStatus()

    return {
      success: true,
      camera: status
    }
  }
}
