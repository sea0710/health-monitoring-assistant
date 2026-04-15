const { api } = require('../../utils/api')
const { showToast, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    tempAvatarPath: '',
    isLoading: false
  },

  onLoad() {
    const app = getApp()
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        avatarUrl: userInfo.avatar_url || '',
        nickname: userInfo.nickname || ''
      })
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    if (avatarUrl) {
      this.setData({
        avatarUrl: avatarUrl,
        tempAvatarPath: avatarUrl
      })
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onNicknameBlur(e) {
    const nickname = e.detail.value
    if (nickname) {
      this.setData({ nickname: nickname.trim() })
    }
  },

  async uploadAvatar(filePath) {
    if (!filePath) return ''

    const cloudPath = 'avatars/' + Date.now() + '-' + Math.floor(Math.random() * 1000) + filePath.match(/\.\w+$/)[0]

    try {
      const res = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })
      return res.fileID
    } catch (error) {
      console.error('头像上传失败:', error)
      throw error
    }
  },

  async saveUserInfo() {
    const { nickname, tempAvatarPath } = this.data

    if (!nickname.trim()) {
      showToast('请输入昵称')
      return
    }

    this.setData({ isLoading: true })
    showLoading('保存中...')

    try {
      const app = getApp()
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
      const userId = userInfo?.user_id

      if (!userId) {
        showToast('用户未登录，请重新登录')
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/login/login' })
        }, 1500)
        return
      }

      let avatarFileId = userInfo.avatar_url || ''

      if (tempAvatarPath) {
        try {
          avatarFileId = await this.uploadAvatar(tempAvatarPath)
        } catch (uploadError) {
          console.error('头像上传失败，继续保存其他信息:', uploadError)
        }
      }

      const res = await api.auth.setUserInfo({
        user_id: userId,
        nickname: nickname.trim(),
        avatar_url: avatarFileId
      })

      if (res.code === 0) {
        const updatedUser = {
          ...userInfo,
          nickname: nickname.trim(),
          avatar_url: avatarFileId
        }
        app.setUserInfo(updatedUser)
        app.globalData.hasUserInfo = true
        app.globalData.needUserInfo = false

        showToast('保存成功')

        setTimeout(() => {
          wx.navigateBack()
        }, 1000)
      } else {
        showToast(res.message || '保存失败')
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      showToast('保存失败，请重试')
    } finally {
      hideLoading()
      this.setData({ isLoading: false })
    }
  }
})
