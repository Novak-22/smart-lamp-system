// 健康检查
export default {
  method: 'GET',
  path: '/health',

  async handler() {
    return {
      status: 'healthy',
      service: 'smart-lamp-system',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  }
}
