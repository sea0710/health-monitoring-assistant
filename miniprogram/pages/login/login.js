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
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
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
    // 由于使用云函数，不需要 token，直接存储用户信息
    app.setUserInfo({
      user_id: data.user_id,
      phone: data.phone
    })

    // 检查是否是新用户
    if (data.is_new_user) {
      this.navigateToPatientCreate()
    } else {
      // 老用户，尝试获取患者信息
      this.checkPatientInfo(data.user_id)
    }
  },

  async checkPatientInfo(userId) {
    try {
      const { api } = require('../../utils/api')
      const res = await api.patients.get(userId)
      if (res.data) {
        const app = getApp()
        app.setPatientInfo(res.data)
        this.navigateToHome()
      } else {
        this.navigateToPatientCreate()
      }
    } catch (error) {
      console.error('获取患者信息失败:', error)
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
