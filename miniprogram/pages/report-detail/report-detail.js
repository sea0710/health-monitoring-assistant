const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

Page({
  data: {
    report: null,
    indicators: []
  },

  onLoad(options) {
    if (options.id) {
      this.loadReportDetail(options.id)
    }
  },

  async loadReportDetail(reportId) {
    showLoading('加载中...')
    
    try {
      const res = await api.reports.detail(reportId)
      
      if (res.code === 0) {
        this.setData({
          report: res.data.report,
          indicators: res.data.indicators
        })
      } else {
        showToast(res.message || '加载失败')
      }
    } catch (error) {
      console.error('加载报告详情失败:', error)
      showToast('加载失败，请重试')
    } finally {
      hideLoading()
    }
  },

  handleBack() {
    wx.navigateBack()
  },

  handleViewTrend() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    
    if (patient) {
      wx.navigateTo({ url: `/pages/trends/trends?patientId=${patient.patient_id}` })
    }
  }
})
