// 静态文件服务 - 首页
import { readFileSync } from 'fs'
import { join } from 'path'

export default {
  method: 'GET',
  path: '/',

  async handler() {
    const html = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf-8')
    return {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      },
      body: html
    }
  }
}
