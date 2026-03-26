App({
  globalData: {
    userInfo: null,
    patientInfo: null,
    token: null,
    apiBaseUrl: 'https://your-api-domain.com/api'
  },

  onLaunch() {
    this.checkLoginStatus()
  },

  onShow() {
  },

  onHide() {
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
      this.getUserInfo()
    }
  },

  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
    const patientInfo = wx.getStorageSync('patientInfo')
    if (patientInfo) {
      this.globalData.patientInfo = patientInfo
    }
  },

  setToken(token) {
    this.globalData.token = token
    wx.setStorageSync('token', token)
  },

  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  setPatientInfo(patientInfo) {
    this.globalData.patientInfo = patientInfo
    wx.setStorageSync('patientInfo', patientInfo)
  },

  clearStorage() {
    this.globalData.token = null
    this.globalData.userInfo = null
    this.globalData.patientInfo = null
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('patientInfo')
  }
})
