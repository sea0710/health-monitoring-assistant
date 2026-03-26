require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const { initDatabase } = require('./config/database-sqlite')

const authRoutes = require('./routes/auth')
const patientRoutes = require('./routes/patients')
const reportRoutes = require('./routes/reports')
const ocrRoutes = require('./routes/ocr')
const trendRoutes = require('./routes/trends')
const { router: referenceRoutes } = require('./routes/references')
const reminderRoutes = require('./routes/reminders')

const app = express()
const PORT = process.env.PORT || 3000

// 全局标志：是否使用数据库
global.USE_DATABASE = false

app.use(helmet({
  contentSecurityPolicy: false
}))
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, '../public')))

app.get('/api', (req, res) => {
  res.json({
    name: '血常规监测助手 API',
    version: '1.0.0',
    mode: global.USE_DATABASE ? 'Database' : 'Memory',
    endpoints: {
      auth: {
        'POST /api/auth/register': '用户注册',
        'POST /api/auth/login': '用户登录'
      },
      patients: {
        'GET /api/patients/:userId': '获取患者档案',
        'POST /api/patients': '创建/更新患者档案'
      },
      reports: {
        'GET /api/reports/:patientId': '获取报告列表',
        'GET /api/reports/detail/:reportId': '获取报告详情',
        'POST /api/reports': '创建报告'
      },
      ocr: {
        'POST /api/ocr': 'OCR识别'
      },
      trends: {
        'GET /api/trends/:patientId': '获取趋势数据'
      },
      references: {
        'GET /api/references': '获取分级速查数据'
      },
      reminders: {
        'GET /api/reminders/:patientId': '获取提醒列表',
        'POST /api/reminders': '创建提醒',
        'DELETE /api/reminders/:reminderId': '删除提醒'
      }
    },
    health: '/health'
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/ocr', ocrRoutes)
app.use('/api/trends', trendRoutes)
app.use('/api/references', referenceRoutes)
app.use('/api/reminders', reminderRoutes)

app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
    timestamp: new Date().toISOString()
  })
})

app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    timestamp: new Date().toISOString()
  })
})

// 初始化数据库并启动服务器
const startServer = async () => {
  try {
    console.log('正在初始化数据库...')
    await initDatabase()
    console.log('数据库初始化成功')
    global.USE_DATABASE = true
    
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT} (数据库模式)`)
      console.log(`网页预览：http://localhost:${PORT}`)
      console.log(`健康检查：http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('数据库初始化失败:', error.message)
    console.log('将以内存模式运行（数据重启后丢失）')
    global.USE_DATABASE = false
    
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}（内存模式）`)
      console.log(`网页预览：http://localhost:${PORT}`)
      console.log(`健康检查：http://localhost:${PORT}/health`)
    })
  }
}

startServer()

module.exports = app
