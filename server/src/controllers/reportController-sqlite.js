const { generateId, query, queryAll, queryOne } = require('../db/sqlite')

// 计算指标分级（严格按照分级速查标准，只判断低于正常范围的情况）
const calculateLevel = (code, value, gender) => {
  const numValue = parseFloat(value)
  
  if (code === 'WBC') {
    // 白细胞分级标准（只判断低于正常范围）
    if (numValue >= 4.0) return 'normal'        // 0级：≥4.0
    if (numValue >= 3.0) return 'warning'       // I级：3.0-3.9
    if (numValue >= 2.0) return 'danger'        // II级：2.0-2.9
    if (numValue >= 1.0) return 'danger'        // III级：1.0-1.9
    return 'critical'                            // IV级：<1.0
  } else if (code === 'NEUT#' || code === 'ANC') {
    // 中性粒细胞分级标准（只判断低于正常范围）
    if (numValue >= 1.5) return 'normal'        // 0级：≥1.5
    if (numValue >= 1.0) return 'warning'       // I级：1.0-1.4
    if (numValue >= 0.5) return 'danger'        // II级：0.5-0.9
    if (numValue >= 0.1) return 'danger'        // III级：0.1-0.4
    return 'critical'                            // IV级：<0.1
  } else if (code === 'HGB') {
    // 血红蛋白分级标准（只判断低于正常范围）
    const lowerBound = gender === '女' ? 110 : 120
    if (numValue >= lowerBound) return 'normal'  // 0级：男≥120/女≥110
    if (numValue >= 90) return 'warning'         // I级：男90-119/女90-109
    if (numValue >= 80) return 'danger'          // II级：80-100
    if (numValue >= 65) return 'danger'          // III级：65-79
    return 'critical'                             // IV级：<65
  } else if (code === 'PLT') {
    // 血小板分级标准（只判断低于正常范围）
    if (numValue >= 100) return 'normal'         // 0级：≥100
    if (numValue >= 75) return 'warning'         // I级：75-99
    if (numValue >= 50) return 'danger'          // II级：50-74
    if (numValue >= 25) return 'danger'          // III级：25-49
    return 'critical'                             // IV级：<25
  }
  
  return 'normal'
}

const getReportsForCurrentUser = (req, res) => {
  try {
    const userId = req.userId
    
    // 找到当前患者的 ID
    const patient = queryOne('SELECT patient_id FROM patients WHERE user_id = ?', [userId])
    
    if (!patient) {
      return res.json({
        code: 0,
        data: [],
        timestamp: new Date().toISOString()
      })
    }
    
    // 获取该患者的所有报告
    const reports = queryAll(
      'SELECT * FROM reports WHERE patient_id = ? ORDER BY test_time DESC',
      [patient.patient_id]
    )
    
    // 为每个报告添加异常指标信息
    const reportsWithDetails = reports.map(report => {
      // 获取报告的指标
      const indicators = queryAll(
        'SELECT * FROM indicators WHERE report_id = ?',
        [report.report_id]
      )
      
      // 获取患者性别用于计算HGB的分级
      const patientInfo = queryOne('SELECT gender FROM patients WHERE patient_id = ?', [report.patient_id])
      const gender = patientInfo ? patientInfo.gender : '男'
      
      // 重新计算每个指标的level
      const updatedIndicators = indicators.map(ind => {
        const calculatedLevel = calculateLevel(ind.indicator_code, ind.test_value, gender)
        return {
          ...ind,
          level: calculatedLevel
        }
      })
      
      // 计算异常指标
      const abnormalIndicators = updatedIndicators.filter(ind => ind.level && ind.level !== 'normal')
      const abnormalCount = abnormalIndicators.length
      
      // 生成异常指标摘要
      let abnormalSummary = ''
      if (abnormalCount > 0) {
        // 指标中文名称映射
        const indicatorNames = {
          'WBC': '白细胞',
          'NEUT#': '中性粒细胞',
          'HGB': '血红蛋白',
          'PLT': '血小板'
        }
        
        const abnormalTexts = abnormalIndicators.map(ind => {
          const name = indicatorNames[ind.indicator_code] || ind.indicator_name || ind.indicator_code
          // 判断趋势（只判断低于正常范围的情况）
          let trend = ''
          // 根据分级速查标准判断
          const referenceMin = {
            'WBC': 4.0,
            'NEUT#': 1.5,
            'HGB': gender === '女' ? 110 : 120,
            'PLT': 100
          }
          const min = referenceMin[ind.indicator_code]
          if (min && ind.test_value < min) {
            trend = '↓'
          }
          return `${name}${trend}`
        })
        abnormalSummary = abnormalTexts.join(' ')
      }
      
      return {
        ...report,
        abnormal_count: abnormalCount,
        abnormal_summary: abnormalSummary
      }
    })
    
    res.json({
      code: 0,
      data: reportsWithDetails,
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

const getReports = (req, res) => {
  try {
    const { patientId } = req.params
    
    const reports = queryAll(
      'SELECT * FROM reports WHERE patient_id = ? ORDER BY test_time DESC',
      [patientId]
    )
    
    // 为每个报告添加异常指标信息
    const reportsWithDetails = reports.map(report => {
      // 获取报告的指标
      const indicators = queryAll(
        'SELECT * FROM indicators WHERE report_id = ?',
        [report.report_id]
      )
      
      // 获取患者性别用于计算HGB的分级
      const patientInfo = queryOne('SELECT gender FROM patients WHERE patient_id = ?', [report.patient_id])
      const gender = patientInfo ? patientInfo.gender : '男'
      
      // 重新计算每个指标的level
      const updatedIndicators = indicators.map(ind => {
        const calculatedLevel = calculateLevel(ind.indicator_code, ind.test_value, gender)
        return {
          ...ind,
          level: calculatedLevel
        }
      })
      
      // 计算异常指标
      const abnormalIndicators = updatedIndicators.filter(ind => ind.level && ind.level !== 'normal')
      const abnormalCount = abnormalIndicators.length
      
      // 生成异常指标摘要
      let abnormalSummary = ''
      if (abnormalCount > 0) {
        // 指标中文名称映射
        const indicatorNames = {
          'WBC': '白细胞',
          'NEUT#': '中性粒细胞',
          'HGB': '血红蛋白',
          'PLT': '血小板'
        }
        
        const abnormalTexts = abnormalIndicators.map(ind => {
          const name = indicatorNames[ind.indicator_code] || ind.indicator_name || ind.indicator_code
          // 判断趋势（只判断低于正常范围的情况）
          let trend = ''
          // 根据分级速查标准判断
          const referenceMin = {
            'WBC': 4.0,
            'NEUT#': 1.5,
            'HGB': gender === '女' ? 110 : 120,
            'PLT': 100
          }
          const min = referenceMin[ind.indicator_code]
          if (min && ind.test_value < min) {
            trend = '↓'
          }
          return `${name}${trend}`
        })
        abnormalSummary = abnormalTexts.join(' ')
      }
      
      return {
        ...report,
        abnormal_count: abnormalCount,
        abnormal_summary: abnormalSummary
      }
    })
    
    res.json({
      code: 0,
      data: reportsWithDetails,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取报告错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取报告失败',
      timestamp: new Date().toISOString()
    })
  }
}

const getReportDetail = (req, res) => {
  try {
    const { reportId } = req.params
    
    const report = queryOne('SELECT * FROM reports WHERE report_id = ?', [reportId])
    
    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }
    
    const indicators = queryAll(
      'SELECT * FROM indicators WHERE report_id = ?',
      [reportId]
    )
    
    // 获取患者性别用于计算HGB的分级
    const patientInfo = queryOne('SELECT gender FROM patients WHERE patient_id = ?', [report.patient_id])
    const gender = patientInfo ? patientInfo.gender : '男'
    
    // 重新计算每个指标的level
    const updatedIndicators = indicators.map(ind => {
      const calculatedLevel = calculateLevel(ind.indicator_code, ind.test_value, gender)
      return {
        ...ind,
        level: calculatedLevel
      }
    })
    
    res.json({
      code: 0,
      data: {
        report,
        indicators: updatedIndicators
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

const createReport = (req, res) => {
  try {
    const { patient_id, test_time, test_hospital, indicators } = req.body
    const userId = req.userId
    
    if (!patient_id || !test_time || !indicators || indicators.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '参数不完整',
        timestamp: new Date().toISOString()
      })
    }
    
    // 验证患者所有权
    const patient = queryOne('SELECT * FROM patients WHERE patient_id = ? AND user_id = ?', [patient_id, userId])
    
    if (!patient) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }
    
    const reportId = generateId('report')
    
    // 计算总体级别
    const levels = indicators.map(i => i.level || 'normal')
    let overallLevel = 'normal'
    if (levels.includes('critical')) overallLevel = 'critical'
    else if (levels.includes('danger')) overallLevel = 'danger'
    else if (levels.includes('warning')) overallLevel = 'warning'
    
    // 计算异常指标
    const abnormalIndicators = indicators.filter(ind => ind.level && ind.level !== 'normal')
    const abnormalCount = abnormalIndicators.length
    
    // 生成异常指标摘要
    let abnormalSummary = ''
    if (abnormalCount > 0) {
      const abnormalTexts = abnormalIndicators.map(ind => {
        const name = ind.indicator_name || ind.indicator_code
        // 判断是上升还是下降
        let trend = ''
        if (ind.standard_min && ind.standard_max) {
          if (ind.test_value < ind.standard_min) {
            trend = '↓'
          } else if (ind.test_value > ind.standard_max) {
            trend = '↑'
          }
        }
        return `${name}${trend}`
      })
      abnormalSummary = abnormalTexts.join(' ')
    }
    
    // 创建报告
    query(
      'INSERT INTO reports (report_id, patient_id, test_time, test_hospital, overall_level, abnormal_count, abnormal_summary) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [reportId, patient_id, test_time, test_hospital || null, overallLevel, abnormalCount, abnormalSummary]
    )
    
    // 创建指标
    for (const indicator of indicators) {
      const indicatorId = generateId('indicator')
      
      // 调试日志：打印每个字段的值
      console.log('[创建指标] indicator:', indicator)
      console.log('[创建指标] indicator_code:', indicator.indicator_code)
      console.log('[创建指标] indicator_name:', indicator.indicator_name)
      console.log('[创建指标] test_value:', indicator.test_value)
      console.log('[创建指标] test_unit:', indicator.test_unit)
      console.log('[创建指标] standard_value:', indicator.standard_value)
      console.log('[创建指标] standard_min:', indicator.standard_min)
      console.log('[创建指标] standard_max:', indicator.standard_max)
      console.log('[创建指标] level:', indicator.level)
      
      query(
        'INSERT INTO indicators (indicator_id, report_id, indicator_code, indicator_name, test_value, test_unit, standard_value, standard_min, standard_max, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          indicatorId,
          reportId,
          indicator.indicator_code || '',
          indicator.indicator_name || '',
          indicator.test_value !== undefined ? indicator.test_value : 0,
          indicator.test_unit !== undefined ? indicator.test_unit : null,
          indicator.standard_value !== undefined ? indicator.standard_value : null,
          indicator.standard_min !== undefined ? indicator.standard_min : null,
          indicator.standard_max !== undefined ? indicator.standard_max : null,
          indicator.level || 'normal'
        ]
      )
    }
    
    // 手动构建返回的报告对象
    const report = {
      report_id: reportId,
      patient_id: patient_id,
      test_time: test_time,
      test_hospital: test_hospital || null,
      overall_level: overallLevel,
      created_at: new Date().toISOString()
    }
    
    res.json({
      code: 0,
      message: '创建成功',
      data: report,
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

const updateReport = (req, res) => {
  try {
    const { reportId } = req.params
    const { test_time, test_hospital, indicators } = req.body
    const userId = req.userId
    
    // 验证报告所有权
    const report = queryOne('SELECT r.* FROM reports r JOIN patients p ON r.patient_id = p.patient_id WHERE r.report_id = ? AND p.user_id = ?', [reportId, userId])
    
    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }
    
    // 计算总体级别和异常指标信息
    let overallLevel = 'normal'
    let abnormalCount = 0
    let abnormalSummary = ''
    
    if (indicators && indicators.length > 0) {
      const levels = indicators.map(i => i.level || 'normal')
      if (levels.includes('critical')) overallLevel = 'critical'
      else if (levels.includes('danger')) overallLevel = 'danger'
      else if (levels.includes('warning')) overallLevel = 'warning'
      
      // 计算异常指标
      const abnormalIndicators = indicators.filter(ind => ind.level && ind.level !== 'normal')
      abnormalCount = abnormalIndicators.length
      
      // 生成异常指标摘要
      if (abnormalCount > 0) {
        const abnormalTexts = abnormalIndicators.map(ind => {
          const name = ind.indicator_name || ind.indicator_code
          // 判断是上升还是下降
          let trend = ''
          if (ind.standard_min && ind.standard_max) {
            if (ind.test_value < ind.standard_min) {
              trend = '↓'
            } else if (ind.test_value > ind.standard_max) {
              trend = '↑'
            }
          }
          return `${name}${trend}`
        })
        abnormalSummary = abnormalTexts.join(' ')
      }
    }
    
    // 更新报告
    query(
      'UPDATE reports SET test_time = ?, test_hospital = ?, overall_level = ?, abnormal_count = ?, abnormal_summary = ? WHERE report_id = ?',
      [test_time, test_hospital || null, overallLevel, abnormalCount, abnormalSummary, reportId]
    )
    
    // 删除旧指标
    query('DELETE FROM indicators WHERE report_id = ?', [reportId])
    
    // 创建新指标
    if (indicators && indicators.length > 0) {
      for (const indicator of indicators) {
        const indicatorId = generateId('indicator')
        query(
          'INSERT INTO indicators (indicator_id, report_id, indicator_code, indicator_name, test_value, test_unit, standard_value, standard_min, standard_max, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            indicatorId,
            reportId,
            indicator.indicator_code,
            indicator.indicator_name,
            indicator.test_value,
            indicator.test_unit || null,
            indicator.standard_value || null,
            indicator.standard_min || null,
            indicator.standard_max || null,
            indicator.level || 'normal'
          ]
        )
      }
    }
    
    const updatedReport = queryOne('SELECT * FROM reports WHERE report_id = ?', [reportId])
    
    res.json({
      code: 0,
      message: '更新成功',
      data: updatedReport,
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

const deleteReport = (req, res) => {
  try {
    const { reportId } = req.params
    const userId = req.userId
    
    // 验证报告所有权
    const report = queryOne('SELECT r.* FROM reports r JOIN patients p ON r.patient_id = p.patient_id WHERE r.report_id = ? AND p.user_id = ?', [reportId, userId])
    
    if (!report) {
      return res.status(404).json({
        code: 404,
        message: '报告不存在',
        timestamp: new Date().toISOString()
      })
    }
    
    // 删除指标
    query('DELETE FROM indicators WHERE report_id = ?', [reportId])
    
    // 删除报告
    query('DELETE FROM reports WHERE report_id = ?', [reportId])
    
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
  getReportsForCurrentUser,
  getReports,
  getReportDetail,
  createReport,
  updateReport,
  deleteReport
}
