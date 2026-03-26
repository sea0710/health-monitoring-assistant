const { Router } = require('express')
const { authMiddleware } = require('../middleware/auth')

// 内存存储引用
const { patients } = require('../controllers/authController-memory')
const { reports, indicators } = require('../controllers/reportController-memory')

const getTrendData = async (req, res) => {
  try {
    const { patientId } = req.params

    // 验证患者权限
    let patient = null
    for (const [_, p] of patients) {
      if (p.patient_id === patientId) {
        patient = p
        break
      }
    }

    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    // 获取该患者的所有报告
    const patientReports = []
    for (const [_, r] of reports) {
      if (r.patient_id === patientId) {
        // 获取该报告的指标
        const reportIndicators = []
        for (const [__, i] of indicators) {
          if (i.report_id === r.report_id) {
            reportIndicators.push(i)
          }
        }
        
        patientReports.push({
          test_time: r.test_time,
          report_id: r.report_id,
          indicators: reportIndicators
        })
      }
    }

    // 按时间排序
    patientReports.sort((a, b) => new Date(a.test_time) - new Date(b.test_time))

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
        reports: patientReports,
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
