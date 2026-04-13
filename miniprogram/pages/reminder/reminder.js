const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

const TEMPLATE_ID = 'VWOzjsDFnzLc4va2_M-zjWSOjhlVw1E_NSo_OPT0a2M'
const FREQUENCY_OPTIONS = ['1个月', '3个月', '6个月']

Page({
  data: {
    hasLogin: false,
    mode: 'blood_routine',
    today: '',
    chemoEndDate: '',
    lastReviewDate: '',
    frequencyIndex: -1,
    frequencyOptions: FREQUENCY_OPTIONS,
    nextReviewPreview: '',
    pendingReminders: [],
    historyReminders: [],
    displayPendingReminders: [],
    displayHistoryReminders: [],
    showDeleteConfirm: false,
    deleteTargetId: null,
    pendingExpanded: false,
    historyExpanded: false,
    deleteFromHistory: false,
    deleteTargetStatus: 'pending',
    showAddModal: false,
    addReminderDate: '',
    addReminderTime: '09:00',
    addReminderMode: 'blood_routine',
    addModeOptions: ['血常规', '其他复查'],
    addModeIndex: 0
  },

  onLoad() {
    const today = this.formatDate(new Date())
    this.setData({
      today
    })
    this.checkLoginAndLoad()
  },

  onShow() {
    this.checkLoginStatus()
  },

  checkLoginAndLoad() {
    const app = getApp()
    
    let retryCount = 0
    while (!app.globalData.hasLogin && retryCount < 15) {
      retryCount++
    }
    
    if (app.globalData.hasLogin) {
      this.setData({ hasLogin: true })
      this.loadPatientInfo()
    } else {
      this.setData({ hasLogin: false })
    }
  },

  checkLoginStatus() {
    const app = getApp()
    this.setData({ hasLogin: app.globalData.hasLogin })
    
    if (app.globalData.hasLogin && !this.data.patient) {
      this.loadPatientInfo()
    }
  },

  loadPatientInfo() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    if (patient) {
      this.setData({ patient })
      this.loadAndSplitReminders()
    }
  },

  handleGuideLogin() {
    wx.navigateTo({ url: '/pages/patient-create/patient-create' })
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.clearUserInfo()
          wx.switchTab({ url: '/pages/home/home' })
        }
      }
    })
  },

  handleModeChange(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  onChemoDateChange(e) {
    this.setData({ chemoEndDate: e.detail.value })
  },