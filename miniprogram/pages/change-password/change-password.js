const app = getApp()

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    isChanging: false,
    canSubmit: false
  },

  onOldPasswordInput(e) {
    this.setData({ oldPassword: e.detail.value })
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
    const { oldPassword, newPassword, confirmPassword } = this.data
    
    const canSubmit = oldPassword.length > 0 &&
                      newPassword.length >= 6 &&
                      newPassword === confirmPassword &&
                      oldPassword !== newPassword
    
    this.setData({ canSubmit })
  },

  async handleChangePassword() {
    const { oldPassword, newPassword, confirmPassword } = this.data

    if (!oldPassword) {
      wx.showToast({ title: '请输入原密码', icon: 'none' })
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

    if (oldPassword === newPassword) {
      wx.showToast({ title: '新密码不能与原密码相同', icon: 'none' })
      return
    }

    this.setData({ isChanging: true })
    wx.showLoading({ title: '修改中...', mask: true })

    try {
      const userInfo = app.getUserInfo()
      
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'changePassword',
          userId: userInfo._id,
          oldPassword: oldPassword,
          newPassword: newPassword
        }
      })

      if (res.result && res.result.code === 0) {
        wx.showToast({
          title: '密码修改成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(res.result?.message || '修改失败')
      }
    } catch (error) {
      console.error('修改密码失败:', error)
      wx.showToast({
        title: error.message || '修改失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isChanging: false })
      wx.hideLoading()
    }
  }
})