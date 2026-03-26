const db = require('../services/databaseService')
const { calculateGrade, generateOverallRisk, TREATMENT_PRINCIPLES } = require('../services/gradeService')

const getReports = async (req, res) => {
  try {
    const { patientId } = req.params

    const patient = await db.getPatientById(patientId)
    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    const reports = await db.getReportsByPatientId(patientId)

    const reportList = await Promise.all(reports.map(async (r) => {
      const indicators = await db.getIndicatorsByReportId(r.report_id)
      const abnormalCount = indicators.filter(i => i.is_abnormal).length
      const abnormalIndicators = indicators
        .filter(i => i.is_abnormal)
        .map(i => `${i.indicator_name} ${i.test_value < i.reference_min ? '↓' : '↑'}`)

      return {
        ...r,
        abnormal_count: abnormalCount,
        abnormal_summary: abnormalIndicators.join(', ')
      }
    }))

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

    const report = await db.getReportById(reportId)
    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }

    const patient = await db.getPatientById(report.patient_id)
    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    const indicators = await db.getIndicatorsByReportId(reportId)
    const overallRisk = generateOverallRisk(indicators)
    const treatment = overallRisk.level !== '正常' ? TREATMENT_PRINCIPLES[overallRisk.level] : null

    res.json({
      code: 0,
      data: {
        report: {
          ...report,
          patient_name: patient.name
        },
        indicators,
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

    const patient = await db.getPatientById(patient_id)
    if (!patient || patient.user_id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const reportData = {
      report_id: reportId,
      patient_id,
      report_type: '血常规',
      test_time,
      test_hospital: test_hospital || null,
      raw_image_url: raw_image_url || null,
      create_time: new Date(),
      update_time: new Date()
    }

    await db.createReport(reportData)

    const gender = patient.gender === '女' ? 'female' : 'male'

    for (const ind of indicatorData) {
      const indicatorId = `ind_${reportId}_${Math.random().toString(36).substr(2, 4)}`
      const grade = calculateGrade(ind.indicator_code, ind.test_value, ind.reference_min, ind.reference_max, gender)

      const indicatorDataToSave = {
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
      }

      await db.createIndicator(indicatorDataToSave)
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

    const report = await db.getReportById(reportId)
    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }

    const patient = await db.getPatientById(report.patient_id)
    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    // Update report
    const updateData = {}
    if (test_time) updateData.test_time = test_time
    if (test_hospital !== undefined) updateData.test_hospital = test_hospital
    updateData.update_time = new Date()

    await db.updateReport(reportId, updateData)

    // Update indicators if provided
    if (indicatorData && Array.isArray(indicatorData)) {
      await db.deleteIndicatorsByReportId(reportId)

      const gender = patient.gender === '女' ? 'female' : 'male'

      for (const ind of indicatorData) {
        const indicatorId = `ind_${reportId}_${Math.random().toString(36).substr(2, 4)}`
        const grade = calculateGrade(ind.indicator_code, ind.test_value, ind.reference_min, ind.reference_max, gender)

        const indicatorDataToSave = {
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
        }

        await db.createIndicator(indicatorDataToSave)
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

    const report = await db.getReportById(reportId)
    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }

    const patient = await db.getPatientById(report.patient_id)
    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    // Delete indicators first
    await db.deleteIndicatorsByReportId(reportId)
    // Then delete report
    await db.deleteReport(reportId)

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
  deleteReport
}
