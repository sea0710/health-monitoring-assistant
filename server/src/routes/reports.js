const { Router } = require('express')
const { authMiddleware } = require('../middleware/auth')

const { getReports, getReportDetail, createReport, updateReport, deleteReport } = global.USE_DATABASE
  ? require('../controllers/reportController')
  : require('../controllers/reportController-memory')

const router = Router()

// 获取当前用户的报告列表（不需要 patientId 参数）
router.get('/', authMiddleware, getReportsForCurrentUser)
router.get('/:patientId', authMiddleware, getReports)
router.get('/detail/:reportId', authMiddleware, getReportDetail)
router.post('/', authMiddleware, createReport)
router.put('/:reportId', authMiddleware, updateReport)
router.delete('/:reportId', authMiddleware, deleteReport)

// 添加一个新函数来获取当前用户的报告
async function getReportsForCurrentUser(req, res) {
  try {
    const userId = req.userId
    
    // 找到当前患者的 ID
    const { patients } = require('../controllers/authController-memory')
    let patientId = null
    for (const [_, p] of patients) {
      if (p.user_id === userId) {
        patientId = p.patient_id
        break
      }
    }
    
    if (!patientId) {
      return res.json({
        code: 0,
        data: [],
        timestamp: new Date().toISOString()
      })
    }
    
    // 调用原有的 getReports 函数
    req.params.patientId = patientId
    return getReports(req, res)
  } catch (error) {
    console.error('获取报告列表错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取报告列表失败',
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = router
