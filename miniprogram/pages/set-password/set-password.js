const { api } = require('../../utils/api')
const { validatePassword, showToast, showLoading, hideLoading } = require('../../utils/util')
const { SECURITY_QUESTIONS } = require('../../utils/constants')

Page({
  data: {
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    showAnswer: true,
    questionList: SECURITY_QUESTIONS,
    questionIndex: -1,
    securityAnswer: '',
    isLoading: false
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value })
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  toggleConfirmPassword() {
    this.setData({ showConfirmPassword: !this.data.showConfirmPassword })
  },

  toggleAnswer() {
    this.setData({ showAnswer: !this.data.showAnswer })
  },

  onQuestionChange(e) {
    this.setData({
      questionIndex: Number(e.detail.value),
      securityAnswer: ''
    })
  },

  onAnswerInput(e) {
    this.setData({ securityAnswer: e.detail.value })
  },

  async handleConfirm() {
    const { password, confirmPassword, questionIndex, questionList, securityAnswer } = this.data

    if (!validatePassword(password)) {
      showToast('密码至少6位，需包含数字和字母')
      return
    }

    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致')
      return
    }

    if (questionIndex < 0) {
      showToast('请选择安全问题')
      return
    }

    if (!securityAnswer.trim()) {
      showToast('请输入安全问题的答案')
      return
    }

    this.setData({ isLoading: true })
    showLoading('设置中...')

    try {
      const app = getApp()
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
      const userId = userInfo?._id || userInfo?.user_id

      if (!userId) {
        showToast('用户信息异常，请重新登录')
        setTimeout(() => {
          const app = getApp()
          app.clearUserInfo()
          wx.switchTab({ url: '/pages/home/home' })
        }, 1500)
        return
      }

      const res = await api.auth.setPassword({
        userId: userId,
        password: password,
        securityQuestionId: questionList[questionIndex].id,
        securityAnswer: securityAnswer.trim()
      })

      if (res.code === 0) {
        const updatedUser = {
          ...userInfo,
          password: '******',
          security_question_id: questionList[questionIndex].id,
          security_question: questionList[questionIndex].question
        }
        app.setUserInfo(updatedUser)
        showToast('密码设置成功')
        setTimeout(() => {
          wx.navigateBack()
        }, 1000)
      } else {
        showToast(res.message || '设置失败')
      }
    } catch (error) {
      showToast(error.message || '设置失败，请重试')
    } finally {
      hideLoading()
      this.setData({ isLoading: false })
    }
  }
})
