const { generateId, query, queryAll, queryOne } = require('../db/sqlite')

const getPatient = (req, res) => {
  try {
    const { userId } = req.params
    
    const patient = queryOne('SELECT * FROM patients WHERE user_id = ?', [userId])
    
    res.json({
      code: 0,
      data: patient || null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取患者错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取患者失败',
      timestamp: new Date().toISOString()
    })
  }
}

const createPatient = (req, res) => {
  try {
    const { name, gender, birthday, tumor_type } = req.body
    const userId = req.userId
    
    if (!name || !gender) {
      return res.status(400).json({
        code: 400,
        message: '姓名和性别不能为空',
        timestamp: new Date().toISOString()
      })
    }
    
    // 检查是否已有患者档案
    const existingPatient = queryOne('SELECT * FROM patients WHERE user_id = ?', [userId])
    
    if (existingPatient) {
      // 更新现有档案
      query(
        'UPDATE patients SET name = ?, gender = ?, birthday = ?, tumor_type = ? WHERE user_id = ?',
        [name, gender, birthday || null, tumor_type || null, userId]
      )
      
      const patient = queryOne('SELECT * FROM patients WHERE user_id = ?', [userId])
      
      res.json({
        code: 0,
        message: '更新成功',
        data: patient,
        timestamp: new Date().toISOString()
      })
    } else {
      // 创建新档案
      const patientId = generateId('patient')
      
      query(
        'INSERT INTO patients (patient_id, user_id, name, gender, birthday, tumor_type) VALUES (?, ?, ?, ?, ?, ?)',
        [patientId, userId, name, gender, birthday || null, tumor_type || null]
      )
      
      const patient = queryOne('SELECT * FROM patients WHERE user_id = ?', [userId])
      
      res.json({
        code: 0,
        message: '创建成功',
        data: patient,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('创建患者错误:', error)
    res.status(500).json({
      code: 500,
      message: '创建患者失败',
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = {
  getPatient,
  createPatient
}
