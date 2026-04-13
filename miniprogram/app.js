App({
  globalData: {
    userInfo: null,
    patientInfo: null,
    token: null,
    openid: null,
    hasLogin: false,
    needUserInfo: false,
    hasUserInfo: false
  },

  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-1gbuq7na412c0c74',
      traceUser: true
    })
    this.autoLogin()
  },

  async autoLogin() {
    try {
      const cachedUser = wx.getStorageSync('userInfo')
      const cachedOpenid = wx.getStorageSync('openid')
      
      if (cachedUser && cachedOpenid) {
        this.globalData.userInfo = cachedUser
        this.globalData.openid = cachedOpenid
        this.globalData.hasLogin = true
        this.globalData.hasUserInfo = !!(cachedUser.nickname && cachedUser.avatar_url)
        
        if (!this.globalData.hasUserInfo) {
          this.globalData.needUserInfo = true
        }
        
        this.silentRefreshLogin()
        return
      }

      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject })
      })

      const res = await wx.cloud.callFunction({
        name: 'login',
        data: { action: 'wechatLogin', code: loginRes.code }
      })

      if (res.result && res.result.code === 0) {
        const data = res.result.data
        this.globalData.userInfo = data.user
        this.globalData.openid = data.openid
        this.globalData.hasLogin = true
        this.globalData.hasUserInfo = data.hasUserInfo || false

        wx.setStorageSync('userInfo', data.user)
        wx.setStorageSync('openid', data.openid)

        if (!this.globalData.hasUserInfo) {
          this.globalData.needUserInfo = true
        }
      } else {
        this.globalData.hasLogin = false
      }
    } catch (error) {
      console.error('自动登录失败:', error)
      this.globalData.hasLogin = false
    }
  },

  silentRefreshLogin() {
    try {
      wx.login({
        success: (loginRes) => {
          wx.cloud.callFunction({
            name: 'login',
            data: { action: 'wechatLogin', code: loginRes.code }
          }).then((res) => {
            if (res.result && res.result.code === 0) {
              const data = res.result.data
              this.setUserInfo(data.user)
              wx.setStorageSync('openid', data.openid)
            }
          }).catch(() => {})
        }
      })
    } catch (e) {}
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
    if (user) {
      this.globalData.hasUserInfo = !!(user.nickname && user.avatar_url)
      if (!this.globalData.hasUserInfo) {
        this.globalData.needUserInfo = true
      } else {
        this.globalData.needUserInfo = false
      }
    }
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
    this.globalData.openid = null
    this.globalData.hasLogin = false
    this.globalData.needUserInfo = false
    this.globalData.hasUserInfo = false
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('patientInfo')
    wx.removeStorageSync('token')
    wx.removeStorageSync('openid')
  }
})