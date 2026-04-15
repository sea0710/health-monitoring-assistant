const { api } = require('../../utils/api')
const { validatePassword, showToast, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    showOldPassword: false,
    showNewPassword: false,
    showConfirmPassword: false,
    isLoading: false
  },

  onOldPasswordInput(e) {
    this.setData({ oldPassword: e.detail.value })
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

  async handleChange() {
    const { oldPassword, newPassword, confirmPassword } = this.data

    if (!oldPassword) {
      showToast('请输入当前密码')
      return
    }

    if (!validatePassword(newPassword)) {
      showToast('新密码至少6位，需包含数字和字母')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致')
      return
    }

    if (oldPassword === newPassword) {
      showToast('新密码不能与当前密码相同')
      return
    }

    this.setData({ isLoading: true })
    showLoading('修改中...')

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

      const res = await api.auth.changePassword({
        userId: userId,
        oldPassword: oldPassword,
        newPassword: newPassword
      })

      if (res.code === 0) {
        showToast('密码修改成功')
        setTimeout(() => {
          wx.navigateBack()
        }, 1000)
      } else {
        showToast(res.message || '修改失败')
      }
    } catch (error) {
      showToast(error.message || '修改失败，请重试')
    } finally {
      hideLoading()
      this.setData({ isLoading: false })
    }
  }
})
