const app = getApp()

Page({
  data: {
    avatarUrl: '',
    avatarDisplayUrl: '',
    nickname: '',
    tempAvatarUrl: '',
    isSaving: false,
    canSave: false
  },

  onLoad() {
    this.loadCurrentUserInfo()
  },

  loadCurrentUserInfo() {
    const userInfo = app.getUserInfo()
    
    if (userInfo) {
      this.setData({
        nickname: userInfo.nickname || '',
        avatarUrl: userInfo.avatar_url || ''
      })

      if (userInfo.avatar_url) {
        this.getAvatarDisplayUrl(userInfo.avatar_url)
      }
    }
  },

  async getAvatarDisplayUrl(fileID) {
    try {
      const res = await wx.cloud.getTempFileURL({
        fileList: [fileID]
      })
      if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
        this.setData({ avatarDisplayUrl: res.fileList[0].tempFileURL })
      }
    } catch (error) {
      console.error('获取头像显示地址失败:', error)
    }
  },

  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    
    if (!avatarUrl) return

    this.setData({ 
      tempAvatarUrl: avatarUrl,
      avatarDisplayUrl: avatarUrl
    })
    this.checkCanSave()
  },

  onNicknameBlur(e) {
    const nickname = e.detail.value
    this.setData({ nickname })
    this.checkCanSave()
  },

  onSubmitNickname(e) {
    const nickname = e.detail.value.nickname
    if (nickname) {
      this.setData({ nickname })
      this.checkCanSave()
    }
  },

  checkCanSave() {
    const { nickname, tempAvatarUrl, avatarUrl } = this.data
    const hasChanges = (nickname && nickname !== (app.getUserInfo()?.nickname || '')) ||
                      !!tempAvatarUrl
    
    this.setData({ canSave: hasChanges || !!(nickname || tempAvatarUrl || avatarUrl) })
  },

  async saveUserInfo() {
    const { nickname, tempAvatarUrl, avatarUrl } = this.data

    if (!nickname && !tempAvatarUrl && !avatarUrl) {
      wx.showToast({
        title: '请至少填写一项信息',
        icon: 'none'
      })
      return
    }

    const userInfo = app.getUserInfo()
    if (!userInfo || !userInfo._id) {
      wx.showToast({
        title: '用户未登录，请重试',
        icon: 'none'
      })
      return
    }

    this.setData({ isSaving: true })
    wx.showLoading({ title: '保存中...', mask: true })

    try {
      let finalAvatarUrl = avatarUrl

      if (tempAvatarUrl) {
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`,
            filePath: tempAvatarUrl
          })
          finalAvatarUrl = uploadRes.fileID
        } catch (uploadError) {
          console.error('头像上传失败:', uploadError)
          wx.hideLoading()
          wx.showToast({
            title: '头像上传失败，请重试',
            icon: 'none'
          })
          this.setData({ isSaving: false })
          return
        }
      }

      const userId = userInfo._id

      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'setUserInfo',
          userId: userId,
          nickname: nickname,
          avatarUrl: finalAvatarUrl
        }
      })

      if (!res.result) {
        throw new Error('云函数无响应，请检查网络连接')
      }

      if (res.result.code === 0) {
        const updatedUser = res.result.data
        
        app.setUserInfo(updatedUser)
        
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(res.result.message || '操作失败')
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      wx.hideLoading()
      
      let errorMsg = '保存失败，请重试'
      if (error.message.includes('登录')) {
        errorMsg = '会话已过期，正在重新登录...'
        setTimeout(() => {
          app.autoLogin().then(() => {
            wx.showToast({ title: '请重新操作', icon: 'none' })
          }).catch(() => {})
        }, 500)
      } else if (error.message) {
        errorMsg = error.message
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ isSaving: false })
    }
  }
})