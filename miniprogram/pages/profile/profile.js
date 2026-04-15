const { api } = require('../../utils/api')
const { showToast, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    userIdSuffix: '',
    patient: null,
    hasPassword: false,
    hasSecurityQuestion: false,
    hasUnsavedChanges: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    const app = getApp()
    const patientInfo = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    const user = app.globalData.userInfo || wx.getStorageSync('userInfo')
    this.setData({
      patient: patientInfo || null,
      hasPassword: !!(user && user.password),
      hasSecurityQuestion: !!(user && (user.security_question_id || user.security_question))
    })
  },

  async loadUserInfo() {
    const app = getApp()
    const user = app.globalData.userInfo || wx.getStorageSync('userInfo')

    if (user) {
      let avatarUrl = user.avatar_url || ''
      if (avatarUrl && avatarUrl.startsWith('cloud://')) {
        try {
          // 等待云服务初始化完成
          await this.waitForCloudReady()
          
          const tempRes = await wx.cloud.getTempFileURL({ fileList: [avatarUrl] })
          if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
            avatarUrl = tempRes.fileList[0].tempFileURL
          }
        } catch (e) {
          console.error('获取头像临时链接失败:', e)
        }
      }

      this.setData({
        avatarUrl: avatarUrl,
        nickname: user.nickname || '',
        hasPassword: !!user.password,
        hasSecurityQuestion: !!(user.security_question_id || user.security_question),
        patient: app.globalData.patientInfo || wx.getStorageSync('patientInfo')
      })
    }
  },

  waitForCloudReady() {
    return new Promise((resolve) => {
      const app = getApp()
      if (app.globalData.cloudReady) {
        resolve()
        return
      }

      // 轮询检查云服务是否初始化完成
      let checkCount = 0
      const maxCheck = 50
      const checkInterval = setInterval(() => {
        checkCount++
        if (app.globalData.cloudReady || checkCount >= maxCheck) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
  },

  async onChooseAvatar(e) {
    try {
      const { avatarUrl } = e.detail
      if (!avatarUrl) return

      this.setData({
        avatarUrl: avatarUrl,
        _pendingAvatarTempPath: avatarUrl,
        hasUnsavedChanges: true
      })
      wx.showToast({ title: '头像已选择，请点击保存', icon: 'none' })
    } catch (error) {
      console.error('头像选择失败:', error)
      showToast('头像设置失败')
    }
  },

  onNicknameBlur(e) {
    const newNickname = e.detail.value?.trim() || ''
    const oldNickname = this.data.nickname

    if (newNickname !== oldNickname) {
      this.setData({ nickname: newNickname, hasUnsavedChanges: true })
    }
  },

  onNicknameConfirm(e) {
    const newNickname = e.detail.value?.trim() || ''
    this.setData({ nickname: newNickname, hasUnsavedChanges: true })
  },

  async handleSaveProfile() {
    const { nickname, _pendingAvatarTempPath } = this.data

    if (!_pendingAvatarTempPath && !nickname) {
      showToast('没有需要保存的修改')
      return
    }

    showLoading('保存中...')
    const app = getApp()
    const user = app.globalData.userInfo || wx.getStorageSync('userInfo')

    if (!user) {
      hideLoading()
      showToast('用户信息丢失，请重新登录')
      return
    }

    const userId = user._id || user.user_id
    if (!userId) {
      hideLoading()
      showToast('用户ID缺失，请重新登录')
      return
    }

    try {
      await this.waitForCloudReady()
      
      const updateData = {}

      if (_pendingAvatarTempPath) {
        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: _pendingAvatarTempPath
        })
        if (uploadRes.fileID) {
          updateData.avatar_url = uploadRes.fileID
          updateData.avatarUrl = uploadRes.fileID
        }
      } else if (user.avatar_url) {
        updateData.avatar_url = user.avatar_url
        updateData.avatarUrl = user.avatar_url
      }

      if (nickname) {
        updateData.nickname = nickname
      } else if (user.nickname) {
        updateData.nickname = user.nickname
      }

      await api.users.update({ userId, ...updateData })

      const updatedUser = { ...user, ...updateData }
      app.setUserInfo(updatedUser)

      let displayAvatarUrl = this.data.avatarUrl
      if (updateData.avatar_url && updateData.avatar_url.startsWith('cloud://')) {
        try {
          const tempRes = await wx.cloud.getTempFileURL({ fileList: [updateData.avatar_url] })
          if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
            displayAvatarUrl = tempRes.fileList[0].tempFileURL
          }
        } catch (e) { }
      }

      this.setData({
        hasUnsavedChanges: false,
        _pendingAvatarTempPath: '',
        avatarUrl: displayAvatarUrl
      })
      hideLoading()
      showToast('保存成功')
    } catch (error) {
      console.error('保存个人信息失败:', error)
      hideLoading()
      showToast(error.message || '保存失败，请重试')
    }
  },

  goToPatientCreate() {
    wx.navigateTo({ url: '/pages/patient-create/patient-create' })
  },

  goToPatientEdit() {
    wx.navigateTo({ url: '/pages/patient-create/patient-create?edit=true' })
  },

  goToSetPassword() {
    wx.navigateTo({ url: '/pages/set-password/set-password' })
  },

  goToResetPassword() {
    wx.navigateTo({ url: '/pages/reset-password/reset-password?mode=all' })
  },

  goToSecurityQuestion() {
    wx.navigateTo({ url: '/pages/security-question/security-question' })
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#ef4444',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.clearUserInfo()
          wx.switchTab({ url: '/pages/home/home' })
        }
      }
    })
  },

  handleResetAccount() {
    wx.showModal({
      title: '重置账号数据',
      content: '将清除密码、安全问题、昵称、头像、患者档案等数据，仅保留账号。此操作不可撤销，确定继续？',
      confirmText: '确定重置',
      confirmColor: '#ef4444',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            showLoading('重置中...')
            const app = getApp()
            const user = app.globalData.userInfo || wx.getStorageSync('userInfo')
            const userId = user?._id || user?.user_id

            if (!userId) {
              hideLoading()
              showToast('用户信息异常')
              return
            }

            await api.auth.setPassword({
              userId: userId,
              password: '',
              questionId: 0,
              answer: ''
            })

            await api.users.update({
              userId: userId,
              nickname: '',
              avatarUrl: '',
              avatar_url: ''
            })

            const patientInfo = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
            if (patientInfo && (patientInfo._id || patientInfo.patient_id)) {
              try {
                await api.patients.delete(patientInfo._id || patientInfo.patient_id)
              } catch (e) {
                console.error('删除患者数据失败:', e)
              }
            }

            const updatedUser = {
              ...user,
              password: '',
              security_question_id: 0,
              security_question: '',
              security_answer: '',
              nickname: '',
              avatar_url: ''
            }
            app.setUserInfo(updatedUser)

            hideLoading()
            showToast('重置成功，请重新登录')

            setTimeout(() => {
              app.clearUserInfo()
              wx.switchTab({ url: '/pages/home/home' })
            }, 1500)
          } catch (error) {
            hideLoading()
            showToast('重置失败，请重试')
          }
        }
      }
    })
  }
})