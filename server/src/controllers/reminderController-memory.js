const { patients } = require('./authController-memory')

const reminders = new Map()

const getReminders = async (req, res) => {
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

    const reminderList = []
    for (const [_, r] of reminders) {
      if (r.patient_id === patientId) {
        reminderList.push(r)
      }
    }

    reminderList.sort((a, b) => a.reminder_date.localeCompare(b.reminder_date))

    res.json({
      code: 0,
      data: reminderList,
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

    for (const [id, r] of reminders) {
      if (r.patient_id === patient_id) {
        reminders.delete(id)
      }
    }

    for (const rem of reminderData) {
      if (!rem.reminder_date || !rem.reminder_time) continue

      const reminderId = `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      reminders.set(reminderId, {
        reminder_id: reminderId,
        patient_id,
        reminder_date: rem.reminder_date,
        reminder_time: rem.reminder_time,
        is_enabled: rem.is_enabled !== undefined ? rem.is_enabled : true,
        create_time: new Date(),
        update_time: new Date()
      })
    }

    res.json({
      code: 0,
      message: '添加成功',
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

    const reminder = reminders.get(reminderId)
    if (!reminder) {
      return res.status(404).json({
        code: 404,
        message: '提醒不存在',
        timestamp: new Date().toISOString()
      })
    }

    let patient = null
    for (const [_, p] of patients) {
      if (p.patient_id === reminder.patient_id) {
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

    reminders.delete(reminderId)

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

    const reminder = reminders.get(reminderId)
    if (!reminder) {
      return res.status(404).json({
        code: 404,
        message: '提醒不存在',
        timestamp: new Date().toISOString()
      })
    }

    let patient = null
    for (const [_, p] of patients) {
      if (p.patient_id === reminder.patient_id) {
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

    const updated = {
      ...reminder,
      is_enabled: is_enabled !== undefined ? is_enabled : reminder.is_enabled,
      update_time: new Date()
    }
    reminders.set(reminderId, updated)

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
  updateReminder,
  reminders
}
