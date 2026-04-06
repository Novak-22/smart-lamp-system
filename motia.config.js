import { config } from 'motia'

export default config({
  plugins: [],
  app: (app) => {
    // 允许 OpenClaw 调用
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type')
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200)
      }
      next()
    })
  }
})
