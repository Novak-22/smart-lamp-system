// 获取历史记录
import { history } from '../utils/history.js'

export default {
  method: 'GET',
  path: '/api/history',

  async handler({ query }) {
    const limit = parseInt(query.limit) || 50
    const action = query.action

    const records = action
      ? history.getByAction(action, limit)
      : history.getAll(limit)

    const stats = history.getStats()

    return {
      success: true,
      records,
      stats,
      total: records.length
    }
  }
}
