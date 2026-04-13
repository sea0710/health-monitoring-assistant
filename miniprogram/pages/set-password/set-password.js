const app = getApp()

const SECURITY_QUESTIONS = [
  { id: 1, question: '您的小学学校名称？', hint: '例如：北京市第一小学' },
  { id: 2, question: '您的宠物名字？', hint: '例如：旺财' },
  { id: 3, question: '您母亲的生日？', hint: '格式：YYYYMMDD，例如：19900101' },
  { id: 4, question: '您出生的城市？', hint: '例如：北京' },
  { id: 5, question: '您最喜欢的电影？', hint: '例如：阿甘正传' }
]

Page({
  data: {
    newPassword: '',
    confirmPassword: '',
    selectedQuestion: null,
    questionIndex: -1,
    answer: '',
    questionList: SECURITY_QUESTIONS,
    isSetting: false,
    canSubmit: false
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value })
    this.checkCanSubmit()
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value })
    this.checkCanSubmit()
  },

  onQuestionChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      selectedQuestion: SECURITY_QUESTIONS[index],
      questionIndex: index
    })
    this.checkCanSubmit()
  },

  onAnswerInput(e) {
    this.setData({ answer: e.detail.value })
    this.checkCanSubmit()
  },

  checkCanSubmit() {
    const { newPassword, confirmPassword, selectedQuestion, answer } = this.data
    
    const canSubmit = newPassword.length >= 6 &&
                      newPassword === confirmPassword &&
                      !!selectedQuestion &&
                      answer.trim().length > 0
    
    this.setData({ canSubmit })
  },

  async handleSetPassword() {
    const { newPassword, confirmPassword, selectedQuestion, questionIndex, answer } = this.data

    if (newPassword.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }

    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }

    if (!selectedQuestion) {
      wx.showToast({ title: '请选择安全问题', icon: 'none' })
      return
    }

    if (!answer.trim()) {
      wx.showToast({ title: '请输入答案', icon: 'none' })
      return
    }

    this.setData({ isSetting: true })
    wx.showLoading({ title: '设置中...', mask: true })

    try {
      const userInfo = app.getUserInfo()
      
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'setPassword',
          userId: userInfo._id,
          password: newPassword,
          questionId: selectedQuestion.id,
          answer: answer.trim()
        }
      })

      if (res.result && res.result.code === 0) {
        wx.showToast({
          title: '密码设置成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(res.result?.message || '设置失败')
      }
    } catch (error) {
      console.error('设置密码失败:', error)
      wx.showToast({
        title: error.message || '设置失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isSetting: false })
      wx.hideLoading()
    }
  }
})