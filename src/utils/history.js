// 历史记录管理
export class HistoryManager {
  constructor() {
    this.records = []
  }

  add(record) {
    this.records.push({
      ...record,
      id: Date.now().toString(),
      timestamp: record.timestamp || new Date().toISOString()
    })
  }

  getAll(limit = 50) {
    return this.records.slice(-limit).reverse()
  }

  getByAction(action, limit = 20) {
    return this.records
      .filter(r => r.action === action)
      .slice(-limit)
      .reverse()
  }

  clear() {
    this.records = []
  }

  getStats() {
    const total = this.records.length
    const detected = this.records.filter(r => r.detected).length
    const notDetected = total - detected

    return {
      total,
      detected,
      notDetected,
      detectionRate: total > 0 ? (detected / total * 100).toFixed(1) : 0
    }
  }
}

export const history = new HistoryManager()
