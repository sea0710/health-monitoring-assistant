const db = require('../services/databaseService')

const getReminders = async (req, res) => {
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

    const reminders = await db.getRemindersByPatientId(patientId)

    res.json({
      code: 0,
      data: reminders,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取提醒列表错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取提醒列表失败',
      timestamp: new Date().toISOString()
    })
  }
}

const createReminders = async (req, res) => {
  try {
    const userId = req.userId
    const { patient_id, reminders: reminderData } = req.body

    if (!patient_id || !reminderData || !Array.isArray(reminderData)) {
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

    const createdReminders = []
    for (const r of reminderData) {
      const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const reminderDataToSave = {
        reminder_id: reminderId,
        patient_id,
        reminder_date: r.reminder_date,
        reminder_time: r.reminder_time || '09:00',
        is_enabled: r.is_enabled !== undefined ? r.is_enabled : true,
        create_time: new Date(),
        update_time: new Date()
      }

      await db.createReminder(reminderDataToSave)
      createdReminders.push(reminderDataToSave)
    }

    res.status(201).json({
      code: 0,
      message: '添加成功',
      data: createdReminders,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('创建提醒错误:', error)
    res.status(500).json({
      code: 500,
      message: '创建提醒失败',
      timestamp: new Date().toISOString()
    })
  }
}

const deleteReminder = async (req, res) => {
  try {
    const { reminderId } = req.params

    const reminder = await db.getReminderById(reminderId)
    if (!reminder) {
      return res.status(404).json({
        code: 404,
        message: '提醒不存在',
        timestamp: new Date().toISOString()
      })
    }

    const patient = await db.getPatientById(reminder.patient_id)
    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    await db.deleteReminder(reminderId)

    res.json({
      code: 0,
      message: '删除成功',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('删除提醒错误:', error)
    res.status(500).json({
      code: 500,
      message: '删除提醒失败',
      timestamp: new Date().toISOString()
    })
  }
}

const updateReminder = async (req, res) => {
  try {
    const { reminderId } = req.params
    const { is_enabled } = req.body

    const reminder = await db.getReminderById(reminderId)
    if (!reminder) {
      return res.status(404).json({
        code: 404,
        message: '提醒不存在',
        timestamp: new Date().toISOString()
      })
    }

    const patient = await db.getPatientById(reminder.patient_id)
    if (!patient || patient.user_id !== req.userId) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        timestamp: new Date().toISOString()
      })
    }

    const updateData = {}
    if (is_enabled !== undefined) updateData.is_enabled = is_enabled

    const updated = await db.updateReminder(reminderId, updateData)

    res.json({
      code: 0,
      message: '更新成功',
      data: updated,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('更新提醒错误:', error)
    res.status(500).json({
      code: 500,
      message: '更新提醒失败',
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = {
  getReminders,
  createReminders,
  deleteReminder,
  updateReminder
}
