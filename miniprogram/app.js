// app.js
App({
  globalData: {
    userInfo: null,
    patient: null,
    patientInfo: null,
    hasLogin: false,
    cloudReady: false
  },

  onLaunch() {
    this.initCloud()
  },

  async initCloud() {
    try {
      wx.cloud.init({ traceUser: true })
      this.globalData.cloudReady = true
    } catch (error) {
      console.error('云服务初始化失败:', error)
    }
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.hasLogin = true
      this.globalData.patientInfo = wx.getStorageSync('patientInfo') || null
    }
  },

  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.hasLogin = !!userInfo
    if (userInfo) {
      wx.setStorageSync('userInfo', userInfo)
    } else {
      wx.removeStorageSync('userInfo')
    }
  },

  setPatientInfo(patientInfo) {
    this.globalData.patientInfo = patientInfo
    this.globalData.patient = patientInfo
    if (patientInfo) {
      wx.setStorageSync('patientInfo', patientInfo)
    } else {
      wx.removeStorageSync('patientInfo')
    }
  },

  clearUserInfo() {
    this.globalData.userInfo = null
    this.globalData.hasLogin = false
    this.globalData.patientInfo = null
    this.globalData.patient = null
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('patientInfo')
  },

  async loadPatientInfo(userId) {
    try {
      const { api } = require('./utils/api')
      const patientRes = await api.patients.get(userId)
      if (patientRes.code === 0 && patientRes.data) {
        this.setPatientInfo(patientRes.data)
      }
    } catch (e) {
      console.error('加载患者信息失败:', e)
    }
  },

  async performLogin() {
    try {
      const loginRes = await wx.login()
      if (!loginRes.code) throw new Error('wx.login 失败')

      const { api } = require('./utils/api')
      const res = await api.auth.wechatLogin(loginRes.code)

      if (res.code === 0 && res.data) {
        const userData = res.data.user || res.data
        userData._id = userData._id || res.data.user_id

        if (userData.password) {
          const checkRes = await api.auth.checkPasswordSet(userData._id)
          if (checkRes.code === 0 && checkRes.data && checkRes.data.hasPassword) {
            const verified = await this.promptPassword(userData)
            if (!verified) {
              return null
            }
          }
        }

        this.setUserInfo(userData)

        try {
          const patientRes = await api.patients.get(userData._id || res.data.user_id)
          if (patientRes.code === 0 && patientRes.data) {
            this.setPatientInfo(patientRes.data)
          }
        } catch (e) {
          console.error('加载患者信息失败:', e)
        }

        return res.data
      }
      throw new Error(res.message || '登录失败')
    } catch (error) {
      console.error('微信一键登录失败:', error)
      throw error
    }
  },

  promptPassword(user) {
    return new Promise((resolve) => {
      wx.hideLoading()
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      if (currentPage && currentPage.showPasswordModal) {
        currentPage.showPasswordModal(user, resolve)
      } else {
        resolve(false)
      }
    })
  }
})