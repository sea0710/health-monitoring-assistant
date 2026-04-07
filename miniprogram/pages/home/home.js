const { api } = require('../../utils/api')
const { formatDate } = require('../../utils/util')

// 根据指标值计算异常等级
function calculateLevel(code, value) {
  if (code === 'WBC') {
    if (value >= 3.5) return 'normal'
    if (value >= 3.0) return 'warning'
    if (value >= 2.0) return 'danger2'
    if (value >= 1.0) return 'danger3'
    return 'critical'
  } else if (code === 'NEUT#') {
    if (value >= 1.8) return 'normal'
    if (value >= 1.5) return 'warning'
    if (value >= 1.0) return 'danger2'
    if (value >= 0.5) return 'danger3'
    return 'critical'
  } else if (code === 'PLT') {
    if (value >= 125) return 'normal'
    if (value >= 100) return 'warning'
    if (value >= 50) return 'danger2'
    if (value >= 25) return 'danger3'
    return 'critical'
  } else if (code === 'HGB') {
    if (value >= 130) return 'normal'
    if (value >= 95) return 'warning'
    if (value >= 80) return 'danger2'
    if (value >= 65) return 'danger3'
    return 'critical'
  }
  return 'normal'
}

// 获取等级文本
function getLevelText(level) {
  const levelTextMap = {
    'normal': '正常',
    'warning': 'Ⅰ度',
    'danger2': 'Ⅱ度',
    'danger3': 'Ⅲ度',
    'critical': 'Ⅳ度'
  }
  return levelTextMap[level] || '正常'
}

Page({
  data: {
    patient: null,
    reports: [],
    displayReports: [],
    reportsExpanded: false,
    nextReminder: null,
    isLoading: true,
    isFirstLoading: true
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    // 保留旧数据，只设置加载状态
    this.setData({ isLoading: true })
    // 减少延迟，确保数据库同步完成
    setTimeout(() => {
      this.loadData()
    }, 100)
  },

  async loadData(retryCount = 0) {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    
    if (!patient || !patient.name) {
      wx.redirectTo({ url: '/pages/patient-create/patient-create' })
      return
    }

    this.setData({ patient })

    try {
      const patientId = patient.patient_id || patient._id
      if (!patientId) {
        this.setData({ 
          reports: [], 
          latestReport: null,
          nextReminder: null,
          isLoading: false,
          isFirstLoading: false
        })
        return
      }

      const reportsRes = await api.reports.list(patientId)
      let reports = reportsRes.data || []
      
      if (reports.length === 0 && retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 200))
        return this.loadData(retryCount + 1)
      }
      
      if (reports.length > 0) {
        const reportIds = reports.map(report => report._id)
        
        const batchRes = await api.reports.batchDetail(reportIds)
        const indicatorsMap = batchRes.data || {}
        
        for (const report of reports) {
          const indicators = indicatorsMap[report._id] || []
          
          const coreCodes = ['WBC', 'NEUT#', 'PLT', 'HGB']
          let abnormalCount = 0
          
          indicators.forEach(ind => {
            if (coreCodes.includes(ind.indicator_code)) {
              const level = calculateLevel(ind.indicator_code, ind.test_value)
              if (level !== 'normal') {
                abnormalCount++
              }
            }
          })
          
          report.abnormal_count = abnormalCount
        }
      }
      
      reports.sort((a, b) => new Date(b.test_time) - new Date(a.test_time))
      
      const latestReport = reports.length > 0 ? reports[0] : null

      this.setData({ 
        reports, 
        displayReports: reports.slice(0, 5),
        latestReport,
        nextReminder: null,
        isLoading: false,
        isFirstLoading: false
      })
    } catch (error) {
      console.error('加载数据失败:', error)
      this.setData({ 
        isLoading: false,
        isFirstLoading: false
      })
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    }
  },

  handleAddReport() {
    wx.navigateTo({ url: '/pages/report-upload/report-upload' })
  },

  handleReportClick(e) {
    const reportId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/report-detail/report-detail?id=${reportId}` })
  },

  handleDeleteReport(e) {
    const reportId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这份报告吗？',
      confirmText: '删除',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await api.reports.delete(reportId)
            
            if (result.code === 0) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.loadData()
            } else {
              wx.showToast({
                title: result.message || '删除失败',
                icon: 'none'
              })
            }
          } catch (error) {
            console.error('删除报告失败:', error)
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  handleQuickAccess(e) {
    const path = e.currentTarget.dataset.path
    wx.switchTab({ url: path })
  },

  toggleReportsExpand() {
    const { reports, reportsExpanded } = this.data
    this.setData({
      reportsExpanded: !reportsExpanded,
      displayReports: !reportsExpanded ? reports : reports.slice(0, 5)
    })
  },

  handlePatientEdit() {
    wx.navigateTo({ url: '/pages/patient-create/patient-create' })
  }
})