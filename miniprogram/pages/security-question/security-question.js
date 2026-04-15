const { api } = require('../../utils/api')
const { showToast, showLoading, hideLoading } = require('../../utils/util')
const { SECURITY_QUESTIONS } = require('../../utils/constants')

Page({
  data: {
    password: '',
    questionList: SECURITY_QUESTIONS,
    questionIndex: -1,
    securityAnswer: '',
    showPassword: true,
    showAnswer: true,
    isLoading: false,
    hasExistingQuestion: false,
    existingQuestionText: ''
  },

  onLoad() {
    this.checkExistingSecurityQuestion()
  },

  async checkExistingSecurityQuestion() {
    try {
      const app = getApp()
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
      const userId = userInfo?._id || userInfo?.user_id

      if (!userId) return

      const res = await api.auth.checkPasswordSet(userId)

      if (res.code === 0 && res.data && res.data.securityQuestionId > 0) {
        const matched = SECURITY_QUESTIONS.find(q => q.id === res.data.securityQuestionId)
        if (matched) {
          this.setData({
            hasExistingQuestion: true,
            existingQuestionText: matched.question,
            questionIndex: res.data.securityQuestionId - 1
          })
        }
      }
    } catch (error) {
      console.error('检查现有安全问题失败:', error)
    }
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
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
    const { password, questionIndex, questionList, securityAnswer } = this.data

    if (!password) {
      showToast('请输入当前密码以验证身份')
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
    showLoading('保存中...')

    try {
      const app = getApp()
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
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

      const verifyRes = await api.auth.verifyPassword({
        userId: userId,
        password: password
      })

      if (verifyRes.code !== 0 || !verifyRes.data.valid) {
        hideLoading()
        this.setData({ isLoading: false })
        showToast('密码错误，请重试')
        return
      }

      const res = await api.auth.setSecurityQuestion({
        userId: userId,
        securityQuestionId: questionList[questionIndex].id,
        securityAnswer: securityAnswer.trim()
      })

      hideLoading()

      if (res.code === 0) {
        const updatedUser = {
          ...userInfo,
          security_question_id: questionList[questionIndex].id
        }
        app.setUserInfo(updatedUser)
        showToast('密保问题设置成功')
        setTimeout(() => {
          wx.navigateBack()
        }, 1000)
      } else {
        showToast(res.message || '设置失败')
      }
    } catch (error) {
      hideLoading()
      showToast(error.message || '操作失败，请重试')
    } finally {
      this.setData({ isLoading: false })
    }
  }
})
