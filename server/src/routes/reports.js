const { Router } = require('express')
const { authMiddleware } = require('../middleware/auth')
const { 
  getReportsForCurrentUser,
  getReports, 
  getReportDetail, 
  createReport, 
  updateReport, 
  deleteReport 
} = require('../controllers/reportController-sqlite')

const router = Router()

// 获取当前用户的报告列表（不需要 patientId 参数）
router.get('/', authMiddleware, getReportsForCurrentUser)
router.get('/:patientId', authMiddleware, getReports)
router.get('/detail/:reportId', authMiddleware, getReportDetail)
router.post('/', authMiddleware, createReport)
router.put('/:reportId', authMiddleware, updateReport)
router.delete('/:reportId', authMiddleware, deleteReport)

module.exports = router
