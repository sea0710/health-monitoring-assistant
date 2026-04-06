// app.js
App({
  globalData: {
    userInfo: null,
    patientInfo: null,
    token: null
  },

  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-1gbuq7na412c0c74',
      traceUser: true
    })
  },

  onError(error) {
    console.error('[全局错误]', error)
    const errorInfo = this.parseError(error)
    this.reportError(errorInfo)
  },

  onPageNotFound(res) {
    console.error('[页面不存在]', res)
    wx.redirectTo({
      url: '/pages/home/home'
    })
  },

  parseError(error) {
    if (typeof error === 'string') {
      return {
        message: error,
        stack: '',
        time: new Date().toISOString()
      }
    }
    return {
      message: error.message || '未知错误',
      stack: error.stack || '',
      time: new Date().toISOString()
    }
  },

  reportError(errorInfo) {
    console.error('[错误上报]', errorInfo)
  },

  setToken(token) {
    this.globalData.token = token
    wx.setStorageSync('token', token)
  },

  setUserInfo(user) {
    this.globalData.userInfo = user
    wx.setStorageSync('userInfo', user)
  },

  setPatientInfo(patient) {
    this.globalData.patientInfo = patient
    wx.setStorageSync('patientInfo', patient)
  },

  getToken() {
    return this.globalData.token || wx.getStorageSync('token')
  },

  getUserInfo() {
    return this.globalData.userInfo || wx.getStorageSync('userInfo')
  },

  getPatientInfo() {
    return this.globalData.patientInfo || wx.getStorageSync('patientInfo')
  },

  clearUserInfo() {
    this.globalData.userInfo = null
    this.globalData.patientInfo = null
    this.globalData.token = null
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('patientInfo')
    wx.removeStorageSync('token')
  }
})