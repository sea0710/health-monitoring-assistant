const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

Page({
  data: {
    patient: null,
    reminders: [],
    showModal: false,
    newReminder: {
      date: '',
      time: '09:00'
    }
  },

  onLoad() {
    this.loadPatientInfo()
  },

  onShow() {
    if (this.data.patient) {
      this.loadReminders()
    }
  },

  loadPatientInfo() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    
    if (patient) {
      this.setData({ patient })
      this.loadReminders()
    }
  },

  async loadReminders() {
    const { patient } = this.data
    
    if (!patient) return

    try {
      const res = await api.reminders.list(patient.patient_id)
      
      if (res.code === 0) {
        this.setData({ reminders: res.data || [] })
      }
    } catch (error) {
      console.error('加载提醒列表失败:', error)
    }
  },

  handleAddReminder() {
    const today = new Date()
    const dateStr = this.formatDate(today)
    
    this.setData({
      showModal: true,
      newReminder: {
        date: dateStr,
        time: '09:00'
      }
    })
  },

  handleCloseModal() {
    this.setData({ showModal: false })
  },

  onDateChange(e) {
    this.setData({
      'newReminder.date': e.detail.value
    })
  },

  onTimeChange(e) {
    this.setData({
      'newReminder.time': e.detail.value
    })
  },

  async handleConfirmAdd() {
    const { patient, newReminder, reminders } = this.data
    
    if (!newReminder.date) {
      showToast('请选择提醒日期')
      return
    }

    showLoading('保存中...')

    try {
      const newReminders = [
        ...reminders.map(r => ({
          reminder_date: r.reminder_date,
          reminder_time: r.reminder_time,
          is_enabled: r.is_enabled
        })),
        {
          reminder_date: newReminder.date,
          reminder_time: newReminder.time,
          is_enabled: true
        }
      ]

      const res = await api.reminders.create({
        patient_id: patient.patient_id,
        reminders: newReminders
      })

      if (res.code === 0) {
        showToast('添加成功')
        this.setData({ showModal: false })
        this.loadReminders()
      } else {
        showToast(res.message || '添加失败')
      }
    } catch (error) {
      console.error('添加提醒失败:', error)
      showToast('添加失败，请重试')
    } finally {
      hideLoading()
    }
  },

  async handleToggleReminder(e) {
    const reminderId = e.currentTarget.dataset.id
    const reminders = this.data.reminders.map(r => {
      if (r.reminder_id === reminderId) {
        return { ...r, is_enabled: !r.is_enabled }
      }
      return r
    })

    this.setData({ reminders })

    try {
      const { patient } = this.data
      await api.reminders.create({
        patient_id: patient.patient_id,
        reminders: reminders.map(r => ({
          reminder_date: r.reminder_date,
          reminder_time: r.reminder_time,
          is_enabled: r.is_enabled
        }))
      })
    } catch (error) {
      console.error('更新提醒状态失败:', error)
    }
  },

  async handleDeleteReminder(e) {
    const reminderId = e.currentTarget.dataset.id
    
    try {
      const res = await api.reminders.delete(reminderId)
      
      if (res.code === 0) {
        showToast('删除成功')
        this.loadReminders()
      }
    } catch (error) {
      console.error('删除提醒失败:', error)
      showToast('删除失败')
    }
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
