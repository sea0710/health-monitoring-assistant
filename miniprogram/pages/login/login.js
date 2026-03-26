const { api } = require('../../utils/api')
const { validatePhone, validatePassword, showToast, showLoading, hideLoading } = require('../../utils/util')
const { DISCLAIMER_TEXT } = require('../../utils/constants')

Page({
  data: {
    phone: '',
    password: '',
    showPassword: false,
    isLoading: false,
    disclaimerText: DISCLAIMER_TEXT
  },

  onLoad() {
    this.checkExistingLogin()
  },

  checkExistingLogin() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.navigateToHome()
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  async handleLogin() {
    const { phone, password } = this.data

    if (!validatePhone(phone)) {
      showToast('请输入正确的11位手机号')
      return
    }

    if (!validatePassword(password)) {
      showToast('密码至少需要6位')
      return
    }

    this.setData({ isLoading: true })
    showLoading('登录中...')

    try {
      const res = await api.auth.login({ phone, password })
      
      this.handleLoginSuccess(res.data)
    } catch (error) {
      if (error.code === 404 || error.message?.includes('用户不存在')) {
        await this.handleRegister({ phone, password })
      } else {
        showToast(error.message || '登录失败，请重试')
      }
    } finally {
      hideLoading()
      this.setData({ isLoading: false })
    }
  },

  async handleRegister(data) {
    showLoading('注册中...')
    
    try {
      const res = await api.auth.register(data)
      this.handleLoginSuccess(res.data)
      showToast('注册成功')
    } catch (error) {
      showToast(error.message || '注册失败，请重试')
    }
  },

  handleLoginSuccess(data) {
    const app = getApp()
    app.setToken(data.token)
    app.setUserInfo(data.user)

    if (data.patient) {
      app.setPatientInfo(data.patient)
      this.navigateToHome()
    } else {
      this.navigateToPatientCreate()
    }
  },

  navigateToHome() {
    wx.switchTab({ url: '/pages/home/home' })
  },

  navigateToPatientCreate() {
    wx.redirectTo({ url: '/pages/patient-create/patient-create' })
  }
})
