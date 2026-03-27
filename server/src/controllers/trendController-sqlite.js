const { queryAll, queryOne } = require('../db/sqlite')

const getTrendData = (req, res) => {
  try {
    let { indicator } = req.params
    const userId = req.userId
    
    // 处理URL编码问题
    if (indicator === 'NEUT') {
      indicator = 'NEUT#'
    }
    
    console.log(`[趋势API] 请求指标: ${indicator}, 用户ID: ${userId}`)
    
    const patient = queryOne('SELECT * FROM patients WHERE user_id = ?', [userId])
    console.log(`[趋势API] 查询患者:`, patient)
    
    if (!patient) {
      console.log(`[趋势API] 未找到患者`)
      return res.json({
        code: 0,
        data: [],
        reference: {},
        timestamp: new Date().toISOString()
      })
    }
    
    const reports = queryAll(
      `SELECT r.report_id, r.test_time, i.indicator_code, i.test_value, i.test_unit, i.standard_min, i.standard_max, i.level
       FROM reports r
       JOIN indicators i ON r.report_id = i.report_id
       WHERE r.patient_id = ? AND i.indicator_code = ?
       ORDER BY r.test_time ASC`,
      [patient.patient_id, indicator]
    )
    console.log(`[趋势API] 查询结果数量: ${reports.length}, 数据:`, reports)
    
    const trendData = reports.map(r => ({
      test_time: r.test_time,
      test_value: r.test_value,
      test_unit: r.test_unit,
      standard_min: r.standard_min,
      standard_max: r.standard_max,
      level: r.level
    }))
    
    const reference = {
      'WBC': { min: 4.0, max: 10.0 },
      'NEUT#': { min: 1.5, max: 7.0 },
      'NEUT%': { min: 40, max: 75 },
      'RBC': { min: 4.0, max: 5.5 },
      'HGB': { min: 110, max: 160 },
      'PLT': { min: 100, max: 300 }
    }
    
    console.log(`[趋势API] 返回数据:`, { code: 0, data: trendData, reference: reference[indicator] })
    
    res.json({
      code: 0,
      data: trendData,
      reference: reference[indicator] || { min: 0, max: 100 },
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

module.exports = {
  getTrendData
}
