const { api } = require('../../utils/api')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    patient: null,
    reports: [],
    nextReminder: null,
    isLoading: true
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    
    if (!patient) {
      wx.redirectTo({ url: '/pages/patient-create/patient-create' })
      return
    }

    this.setData({ patient, isLoading: true })

    try {
      const reportsRes = await api.reports.list(patient.patient_id)
      const reports = reportsRes.data || []
      
      reports.sort((a, b) => new Date(b.test_time) - new Date(a.test_time))
      
      const remindersRes = await api.reminders.list(patient.patient_id)
      const reminders = remindersRes.data || []
      
      const today = formatDate(new Date())
      const upcoming = reminders
        .filter(r => r.reminder_date >= today && r.is_enabled)
        .sort((a, b) => a.reminder_date.localeCompare(b.reminder_date))[0]
      
      const nextReminder = upcoming ? `${upcoming.reminder_date} ${upcoming.reminder_time}` : null

      this.setData({ 
        reports, 
        nextReminder,
        isLoading: false 
      })
    } catch (error) {
      console.error('加载数据失败:', error)
      this.setData({ isLoading: false })
    }
  },

  handleAddReport() {
    wx.navigateTo({ url: '/pages/report-upload/report-upload' })
  },

  handleReportClick(e) {
    const reportId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/report-detail/report-detail?id=${reportId}` })
  },

  handleQuickAccess(e) {
    const path = e.currentTarget.dataset.path
    wx.navigateTo({ url: path })
  }
})
