const { Router } = require('express')
const { authMiddleware } = require('../middleware/auth')

const getTrendData = async (req, res) => {
  try {
    const { patientId } = req.params

    // 使用数据库或内存控制器
    const reportController = global.USE_DATABASE
      ? require('../controllers/reportController')
      : require('../controllers/reportController-memory')

    const reports = await reportController.getReports(req, res, true) // true 表示内部调用
    const patientController = global.USE_DATABASE
      ? require('../controllers/patientController')
      : require('../controllers/patientController-memory')

    const patient = await patientController.getPatientById(patientId)

    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    // 整理趋势数据
    const trendReports = reports.map(r => ({
      test_time: r.test_time,
      report_id: r.report_id,
      indicators: r.indicators || []
    }))

    trendReports.sort((a, b) => new Date(a.test_time) - new Date(b.test_time))

    const reference = {
      'WBC': { min: 4.0, max: 10.0 },
      'NEUT#': { min: 2.0, max: 7.0 },
      'HGB': { min: 110, max: 160 },
      'PLT': { min: 100, max: 300 }
    }

    const units = {
      'WBC': '×10⁹/L',
      'NEUT#': '×10⁹/L',
      'HGB': 'g/L',
      'PLT': '×10⁹/L'
    }

    res.json({
      code: 0,
      data: {
        reports: trendReports,
        reference,
        units
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取趋势数据错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取趋势数据失败',
      timestamp: new Date().toISOString()
    })
  }
}

const router = Router()

router.get('/:patientId', authMiddleware, getTrendData)

module.exports = router
