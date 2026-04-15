const { api } = require('../../utils/api')
const { validatePassword, showToast, showLoading, hideLoading } = require('../../utils/util')
const { SECURITY_QUESTIONS } = require('../../utils/constants')

Page({
  data: {
    mode: 'all',
    verifyMethod: 'password',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    showOldPassword: true,
    showNewPassword: true,
    showConfirmPassword: true,
    showSecurityAnswer: true,
    isLoading: false,
    hasSecurityQuestion: false,
    securityQuestionText: '',
    securityAnswer: ''
  },

  onLoad(options) {
    if (options.mode === 'security') {
      this.setData({ mode: 'security', verifyMethod: 'security' })
      this.checkSecurityQuestion()
    } else if (options.mode === 'password') {
      this.setData({ mode: 'password', verifyMethod: 'password' })
    } else {
      this.setData({ mode: 'all', verifyMethod: 'password' })
      this.checkSecurityQuestion()
    }
  },

  onVerifyMethodChange(e) {
    this.setData({ verifyMethod: e.currentTarget.dataset.method })
  },

  async checkSecurityQuestion() {
    try {
      const app = getApp()
      const localUser = wx.getStorageSync('_tempLoginUser')
      const globalUser = app.globalData.userInfo
      const storageUser = wx.getStorageSync('userInfo')
      const userInfo = localUser || globalUser || storageUser
      const userId = userInfo?._id || userInfo?.user_id

      if (!userId) {
        console.error('checkSecurityQuestion: 无法获取userId')
        return
      }

      let hasSecurity = false
      let securityQuestionId = 0
      let securityQuestionText = ''

      if (userInfo && userInfo.security_question) {
        hasSecurity = true
        securityQuestionText = userInfo.security_question
        securityQuestionId = userInfo.security_question_id || 0
        console.log('本地数据发现安全问题:', securityQuestionText)
      }

      if (!hasSecurity) {
        try {
          const res = await api.auth.checkPasswordSet(userId)
          if (res.code === 0 && res.data) {
            if (res.data.hasSecurityQuestion) {
              hasSecurity = true
              securityQuestionId = res.data.securityQuestionId || 0
            }
          }
        } catch (e) {
          console.warn('checkPasswordSet调用失败:', e)
        }
      }

      if (!hasSecurity) {
        try {
          const userRes = await api.auth.getUserInfo(userId)
          if (userRes.code === 0 && userRes.data && userRes.data.hasSecurityQuestion) {
            hasSecurity = true
            securityQuestionId = userRes.data.security_question_id || 0
            securityQuestionText = userRes.data.security_question || ''
          }
        } catch (e2) {
          console.warn('getUserInfo调用失败:', e2)
        }
      }

      this.setData({ hasSecurityQuestion: hasSecurity })

      if (hasSecurity) {
        if (securityQuestionId > 0) {
          const matched = SECURITY_QUESTIONS.find(q => q.id === securityQuestionId)
          if (matched) {
            this.setData({ securityQuestionText: matched.question })
            return
          }
        }
        if (securityQuestionText) {
          this.setData({ securityQuestionText })
        } else {
          this.setData({ securityQuestionText: '您设置的安全问题' })
        }
      }
    } catch (error) {
      console.error('检查安全问题失败:', error)
    }
  },

  onOldPasswordInput(e) {
    this.setData({ oldPassword: e.detail.value })
  },

  onSecurityAnswerInput(e) {
    this.setData({ securityAnswer: e.detail.value })
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value })
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value })
  },

  toggleOldPassword() {
    this.setData({ showOldPassword: !this.data.showOldPassword })
  },

  toggleNewPassword() {
    this.setData({ showNewPassword: !this.data.showNewPassword })
  },

  toggleConfirmPassword() {
    this.setData({ showConfirmPassword: !this.data.showConfirmPassword })
  },

  toggleSecurityAnswer() {
    this.setData({ showSecurityAnswer: !this.data.showSecurityAnswer })
  },

  async handleReset() {
    const { mode, verifyMethod, oldPassword, securityAnswer, newPassword, confirmPassword, hasSecurityQuestion } = this.data

    if (!validatePassword(newPassword)) {
      showToast('新密码至少6位，需包含数字和字母')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('两次输入的密码不一致')
      return
    }

    let needOldPassword = false
    let needSecurityAnswer = false

    if (mode === 'security') {
      needSecurityAnswer = true
    } else if (mode === 'password') {
      needOldPassword = true
    } else {
      if (verifyMethod === 'security') {
        needSecurityAnswer = true
      } else {
        needOldPassword = true
      }
    }

    if (needOldPassword && !oldPassword) {
      showToast('请输入当前密码')
      return
    }

    if (needSecurityAnswer) {
      if (!hasSecurityQuestion) {
        showToast('未设置安全问题，无法使用此方式')
        return
      }
      if (!securityAnswer.trim()) {
        showToast('请输入安全问题的答案')
        return
      }
    }

    this.setData({ isLoading: true })
    showLoading('处理中...')

    try {
      const app = getApp()
      const localUser = wx.getStorageSync('_tempLoginUser')
      const globalUser = app.globalData.userInfo
      const storageUser = wx.getStorageSync('userInfo')
      const userInfo = localUser || globalUser || storageUser
      const userId = userInfo?._id || userInfo?.user_id

      if (!userId) {
        hideLoading()
        this.setData({ isLoading: false })
        showToast('用户信息异常，请重新登录')
        setTimeout(() => {
          app.clearUserInfo()
          wx.switchTab({ url: '/pages/home/home' })
        }, 1500)
        return
      }

      let res
      if (needOldPassword) {
        res = await api.auth.changePassword({
          userId: userId,
          oldPassword: oldPassword,
          newPassword: newPassword
        })
      } else {
        res = await api.auth.resetPassword({
          userId: userId,
          answer: securityAnswer.trim(),
          securityAnswer: securityAnswer.trim(),
          newPassword: newPassword
        })
      }

      hideLoading()

      if (res.code === 0) {
        showToast('密码修改成功')
        setTimeout(() => {
          wx.navigateBack()
        }, 1000)
      } else {
        const errMsg = res.message || res.error || '操作失败'
        console.error('重置密码返回错误:', res)
        showToast(errMsg)
      }
    } catch (error) {
      hideLoading()
      const errMsg = (error && error.message) || (error && error.errMsg) || '网络异常，请重试'
      console.error('重置密码异常:', error)
      showToast(errMsg)
    } finally {
      this.setData({ isLoading: false })
    }
  }
})
