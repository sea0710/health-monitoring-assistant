const { generateId, query, queryAll, queryOne } = require('../db/sqlite')

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
    
    res.json({
      code: 0,
      data: reports,
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
    
    res.json({
      code: 0,
      data: reports,
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
    
    res.json({
      code: 0,
      data: {
        report,
        indicators
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
    
    // 创建报告
    query(
      'INSERT INTO reports (report_id, patient_id, test_time, test_hospital, overall_level) VALUES (?, ?, ?, ?, ?)',
      [reportId, patient_id, test_time, test_hospital || null, overallLevel]
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
    
    // 更新报告
    query(
      'UPDATE reports SET test_time = ?, test_hospital = ? WHERE report_id = ?',
      [test_time, test_hospital || null, reportId]
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
