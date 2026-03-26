const db = require('../services/databaseService')

const getPatient = async (req, res) => {
  try {
    const { userId } = req.params

    const patient = await db.getPatientByUserId(userId)

    if (!patient) {
      return res.json({
        code: 0,
        data: null,
        message: '暂无患者档案',
        timestamp: new Date().toISOString()
      })
    }

    res.json({
      code: 0,
      data: patient,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取患者档案错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取患者档案失败',
      timestamp: new Date().toISOString()
    })
  }
}

const createPatient = async (req, res) => {
  try {
    const userId = req.userId
    const { name, gender, birthday, tumor_type, treatment_plan, chemotherapy_cycles, last_chemo_end_date } = req.body

    if (!name) {
      return res.status(400).json({
        code: 400,
        message: '患者姓名不能为空',
        timestamp: new Date().toISOString()
      })
    }

    // Check if patient already exists
    const existingPatient = await db.getPatientByUserId(userId)
    if (existingPatient) {
      return res.status(400).json({
        code: 400,
        message: '每个用户只能创建一个患者档案',
        timestamp: new Date().toISOString()
      })
    }

    const patientId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const patientData = {
      patient_id: patientId,
      user_id: userId,
      name,
      gender: gender || null,
      birthday: birthday || null,
      tumor_type: tumor_type || null,
      treatment_plan: treatment_plan || null,
      chemotherapy_cycles: chemotherapy_cycles || 0,
      last_chemo_end_date: last_chemo_end_date || null,
      create_time: new Date(),
      update_time: new Date()
    }

    await db.createPatient(patientData)

    res.status(201).json({
      code: 0,
      message: '创建成功',
      data: patientData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('创建患者档案错误:', error)
    res.status(500).json({
      code: 500,
      message: '创建患者档案失败',
      timestamp: new Date().toISOString()
    })
  }
}

const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params
    const updateData = req.body

    const patient = await db.getPatientById(patientId)
    if (!patient) {
      return res.status(404).json({
        code: 404,
        message: '患者档案不存在',
        timestamp: new Date().toISOString()
      })
    }

    if (patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权修改',
        timestamp: new Date().toISOString()
      })
    }

    const updated = await db.updatePatient(patientId, updateData)

    res.json({
      code: 0,
      message: '更新成功',
      data: updated,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('更新患者档案错误:', error)
    res.status(500).json({
      code: 500,
      message: '更新患者档案失败',
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = {
  getPatient,
  createPatient,
  updatePatient
}
