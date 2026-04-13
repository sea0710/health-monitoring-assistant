const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    accountIdentifier: '',
    showResetForm: false,
    foundUser: null,
    answer: '',
    newPassword: '',
    confirmPassword: '',
    isFinding: false,
    isResetting: false,
    canSubmit: false,
    errorMsg: ''
  },

  onAccountInput(e) {
    this.setData({ 
      accountIdentifier: e.detail.value.trim(),
      errorMsg: '' 
    })
  },

  async handleFindAccount() {
    const { accountIdentifier } = this.data

    if (!accountIdentifier) {
      this.setData({ errorMsg: '请输入账号标识' })
      return
    }

    this.setData({ isFinding: true, errorMsg: '' })
    wx.showLoading({ title: '查找中...', mask: true })

    try {
      const res = await db.collection('users')
        .where(db.command.or([
          { openid: accountIdentifier },
          { nickname: accountIdentifier }
        ]))
        .get()

      if (res.data.length === 0) {
        this.setData({ errorMsg: '未找到匹配的账户' })
      } else if (!res.data[0].security_question || !res.data[0].security_answer) {
        this.setData({ errorMsg: '该账户未设置安全问题，无法通过此方式重置密码' })
      } else {
        this.setData({
          foundUser: res.data[0],
          showResetForm: true
        })
      }
    } catch (error) {
      console.error('查找账户失败:', error)
      this.setData({ errorMsg: '查找失败，请重试' })
    } finally {
      this.setData({ isFinding: false })
      wx.hideLoading()
    }
  },

  onAnswerInput(e) {
    this.setData({ answer: e.detail.value })
    this.checkCanSubmit()
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value })
    this.checkCanSubmit()
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value })
    this.checkCanSubmit()
  },

  checkCanSubmit() {
    const { answer, newPassword, confirmPassword, foundUser } = this.data
    
    const canSubmit = !!foundUser &&
                      answer.trim().length > 0 &&
                      newPassword.length >= 6 &&
                      newPassword === confirmPassword
    
    this.setData({ canSubmit })
  },

  async handleResetPassword() {
    const { answer, newPassword, confirmPassword, foundUser } = this.data

    if (!answer.trim()) {
      wx.showToast({ title: '请输入答案', icon: 'none' })
      return
    }

    if (newPassword.length < 6) {
      wx.showToast({ title: '新密码至少6位', icon: 'none' })
      return
    }

    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }

    this.setData({ isResetting: true, errorMsg: '' })
    wx.showLoading({ title: '重置中...', mask: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'resetPassword',
          userId: foundUser._id,
          answer: answer.trim(),
          newPassword: newPassword
        }
      })

      if (res.result && res.result.code === 0) {
        wx.showToast({
          title: '密码重置成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.redirectTo({ url: '/pages/login/login' })
        }, 1500)
      } else {
        throw new Error(res.result?.message || '重置失败')
      }
    } catch (error) {
      console.error('重置密码失败:', error)
      
      if (error.message && error.message.includes('答案错误')) {
        this.setData({ errorMsg: '安全问题答案错误，请重新尝试' })
      } else {
        this.setData({ errorMsg: error.message || '重置失败，请重试' })
      }
    } finally {
      this.setData({ isResetting: false })
      wx.hideLoading()
    }
  }
})