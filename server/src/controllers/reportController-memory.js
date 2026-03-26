const { patients } = require('./authController-memory')
const { calculateGrade, generateOverallRisk, TREATMENT_PRINCIPLES } = require('../services/gradeService')

const reports = new Map()
const indicators = new Map()

const getReports = async (req, res) => {
  try {
    const { patientId } = req.params

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

    const reportList = []
    for (const [_, r] of reports) {
      if (r.patient_id === patientId) {
        let abnormalCount = 0
        const abnormalIndicators = []
        
        for (const [_, i] of indicators) {
          if (i.report_id === r.report_id && i.is_abnormal) {
            abnormalCount++
            abnormalIndicators.push(`${i.indicator_name} ${i.test_value < i.reference_min ? '↓' : '↑'}`)
          }
        }
        
        reportList.push({
          ...r,
          abnormal_count: abnormalCount,
          abnormal_summary: abnormalIndicators.join(', ')
        })
      }
    }

    reportList.sort((a, b) => new Date(b.test_time) - new Date(a.test_time))

    res.json({
      code: 0,
      data: reportList,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取报告列表错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取报告列表失败',
      timestamp: new Date().toISOString()
    })
  }
}

const getReportDetail = async (req, res) => {
  try {
    const { reportId } = req.params

    let report = null
    for (const [_, r] of reports) {
      if (r.report_id === reportId) {
        report = r
        break
      }
    }

    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }

    let patient = null
    for (const [_, p] of patients) {
      if (p.patient_id === report.patient_id) {
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

    const indicatorList = []
    for (const [_, i] of indicators) {
      if (i.report_id === reportId) {
        indicatorList.push(i)
      }
    }

    const overallRisk = generateOverallRisk(indicatorList)
    const treatment = overallRisk.level !== '正常' ? TREATMENT_PRINCIPLES[overallRisk.level] : null

    res.json({
      code: 0,
      data: {
        report: {
          ...report,
          patient_name: patient.name
        },
        indicators: indicatorList,
        overall_risk: overallRisk,
        treatment: treatment
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取报告详情错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取报告详情失败',
      timestamp: new Date().toISOString()
    })
  }
}

const createReport = async (req, res) => {
  try {
    const userId = req.userId
    const { patient_id, test_time, test_hospital, raw_image_url, indicators: indicatorData } = req.body

    if (!patient_id || !test_time || !indicatorData || !Array.isArray(indicatorData)) {
      return res.status(400).json({
        code: 400,
        message: '参数不完整',
        timestamp: new Date().toISOString()
      })
    }

    let patient = null
    for (const [_, p] of patients) {
      if (p.patient_id === patient_id) {
        patient = p
        break
      }
    }

    if (!patient || patient.user_id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    reports.set(reportId, {
      report_id: reportId,
      patient_id,
      report_type: '血常规',
      test_time,
      test_hospital: test_hospital || null,
      raw_image_url: raw_image_url || null,
      create_time: new Date(),
      update_time: new Date()
    })

    const gender = patient.gender === '女' ? 'female' : 'male'

    for (const ind of indicatorData) {
      const indicatorId = `ind_${reportId}_${Math.random().toString(36).substr(2, 4)}`
      const grade = calculateGrade(ind.indicator_code, ind.test_value, ind.reference_min, ind.reference_max, gender)

      indicators.set(indicatorId, {
        indicator_id: indicatorId,
        report_id: reportId,
        indicator_code: ind.indicator_code,
        indicator_name: ind.indicator_name,
        test_value: ind.test_value,
        reference_min: ind.reference_min,
        reference_max: ind.reference_max,
        unit: ind.unit,
        is_abnormal: grade.is_abnormal,
        abnormal_level: grade.level,
        create_time: new Date()
      })
    }

    res.status(201).json({
      code: 0,
      message: '报告创建成功',
      data: { report_id: reportId },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('创建报告错误:', error)
    res.status(500).json({
      code: 500,
      message: '创建报告失败',
      timestamp: new Date().toISOString()
    })
  }
}

const updateReport = async (req, res) => {
  try {
    const { reportId } = req.params
    const { test_time, test_hospital, indicators: indicatorData } = req.body

    const report = reports.get(reportId)
    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }

    const patient = patients.get(report.patient_id)
    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    reports.set(reportId, {
      ...report,
      test_time: test_time || report.test_time,
      test_hospital: test_hospital !== undefined ? test_hospital : report.test_hospital,
      update_time: new Date()
    })

    if (indicatorData && Array.isArray(indicatorData)) {
      for (const [_, i] of indicators) {
        if (i.report_id === reportId) {
          indicators.delete(_)
        }
      }

      const gender = patient.gender === '女' ? 'female' : 'male'

      for (const ind of indicatorData) {
        const indicatorId = `ind_${reportId}_${Math.random().toString(36).substr(2, 4)}`
        const grade = calculateGrade(ind.indicator_code, ind.test_value, ind.reference_min, ind.reference_max, gender)

        indicators.set(indicatorId, {
          indicator_id: indicatorId,
          report_id: reportId,
          indicator_code: ind.indicator_code,
          indicator_name: ind.indicator_name,
          test_value: ind.test_value,
          reference_min: ind.reference_min,
          reference_max: ind.reference_max,
          unit: ind.unit,
          is_abnormal: grade.is_abnormal,
          abnormal_level: grade.level,
          create_time: new Date()
        })
      }
    }

    res.json({
      code: 0,
      message: '更新成功',
      data: { report_id: reportId },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('更新报告错误:', error)
    res.status(500).json({
      code: 500,
      message: '更新报告失败',
      timestamp: new Date().toISOString()
    })
  }
}

const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params

    const report = reports.get(reportId)
    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }

    const patient = patients.get(report.patient_id)
    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    for (const [key, i] of indicators) {
      if (i.report_id === reportId) {
        indicators.delete(key)
      }
    }

    reports.delete(reportId)

    res.json({
      code: 0,
      message: '删除成功',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('删除报告错误:', error)
    res.status(500).json({
      code: 500,
      message: '删除报告失败',
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = {
  getReports,
  getReportDetail,
  createReport,
  updateReport,
  deleteReport,
  reports,
  indicators
}
