const { api } = require('../../utils/api')
const { calculateLevel, CORE_INDICATOR_CODES } = require('../../utils/constants')

Page({
  data: {
    patient: null,
    reports: [],
    displayReports: [],
    reportsExpanded: false,
    latestReport: null,
    isLoading: true,
    isFirstLoading: true,
    hasLogin: false,
    userNickname: '',
    userAvatar: '',
    agreedToTerms: false,
    showPasswordModal: false,
    passwordModalValue: '',
    passwordModalVisible: false,
    passwordModalError: ''
  },

  _passwordModalUser: null,
  _passwordModalResolve: null,

  onLoad() {
    this.checkLoginAndLoadData()
  },

  onShow() {
    this.checkLoginAndLoadData()
  },

  async checkLoginAndLoadData() {
    const app = getApp()
    const avatarUrl = (app.globalData.userInfo && app.globalData.userInfo.avatar_url) || ''

    const updateData = {
      hasLogin: app.globalData.hasLogin,
      userNickname: (app.globalData.userInfo && app.globalData.userInfo.nickname) || '',
      userAvatar: avatarUrl
    }

    if (!app.globalData.hasLogin) {
      updateData.agreedToTerms = false
    }

    this.setData(updateData)

    if (avatarUrl && avatarUrl.startsWith('cloud://')) {
      wx.cloud.getTempFileURL({
        fileList: [avatarUrl],
        success: (res) => {
          if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
            this.setData({ userAvatar: res.fileList[0].tempFileURL })
          }
        }
      })
    }

    if (!app.globalData.hasLogin) {
      this.setData({ isLoading: false, isFirstLoading: false })
      return
    }

    this.loadData()
  },

  async handleLogin() {
    if (!this.data.agreedToTerms) {
      wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none', duration: 2000 })
      return
    }

    wx.showLoading({ title: '登录中...' })

    try {
      const app = getApp()
      const result = await app.performLogin()

      if (result === null) {
        wx.hideLoading()
        return
      }

      this.setData({
        hasLogin: app.globalData.hasLogin,
        userNickname: (app.globalData.userInfo && app.globalData.userInfo.nickname) || '',
        userAvatar: ''
      })

      wx.removeStorageSync('_tempLoginUser')

      const avatarUrl = (app.globalData.userInfo && app.globalData.userInfo.avatar_url) || ''
      if (avatarUrl) {
        if (avatarUrl.startsWith('cloud://')) {
          try {
            const tempRes = await wx.cloud.getTempFileURL({ fileList: [avatarUrl] })
            if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
              this.setData({ userAvatar: tempRes.fileList[0].tempFileURL })
            }
          } catch (e) {
            this.setData({ userAvatar: avatarUrl })
          }
        } else {
          this.setData({ userAvatar: avatarUrl })
        }
      }

      wx.hideLoading()
      if (app.globalData.hasLogin) {
        wx.showToast({ title: '登录成功', icon: 'success' })
        this.loadData()
      }
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      wx.showToast({ title: error.message || '登录失败，请重试', icon: 'none', duration: 3000 })
    }
  },

  async loadData(retryCount = 0) {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')

    if (!patient || !patient.name) {
      this.setData({
        patient: null,
        reports: [],
        displayReports: [],
        isLoading: false,
        isFirstLoading: false
      })
      return
    }

    this.setData({ patient })

    try {
      const patientId = patient._id || patient.patient_id

      if (!patientId) {

        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
        const userId = userInfo?._id || userInfo?.user_id

        if (userId) {
          try {
            const reloadRes = await api.patients.get(userId)

            if (reloadRes.data && reloadRes.data._id && reloadRes.data.name) {
              app.setPatientInfo(reloadRes.data)
              this.setData({ patient: reloadRes.data })
              return this.loadData(0)
            }
          } catch (e) {
            console.error('重新加载失败:', e)
          }
        }

        this.setData({
          reports: [],
          latestReport: null,
          isLoading: false,
          isFirstLoading: false
        })
        return
      }

      const reportsRes = await api.reports.list(patientId)
      let reports = reportsRes.data || []

      if (reports.length === 0 && retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 200))
        return this.loadData(retryCount + 1)
      }

      if (reports.length > 0) {
        const reportIds = reports.map(report => report._id)
        const batchRes = await api.reports.batchDetail(reportIds)
        const indicatorsMap = batchRes.data || {}

        for (const report of reports) {
          const indicators = indicatorsMap[report._id] || []
          let abnormalCount = 0

          indicators.forEach(ind => {
            if (CORE_INDICATOR_CODES.includes(ind.indicator_code)) {
              const { isAbnormal } = calculateLevel(ind.indicator_code, ind.test_value)
              if (isAbnormal) {
                abnormalCount++
              }
            }
          })

          report.abnormal_count = abnormalCount
        }
      }

      reports.sort((a, b) => new Date(b.test_time) - new Date(a.test_time))
      const latestReport = reports.length > 0 ? reports[0] : null

      this.setData({
        reports,
        displayReports: reports.slice(0, 5),
        latestReport,
        isLoading: false,
        isFirstLoading: false
      })
    } catch (error) {
      console.error('加载数据失败:', error)
      this.setData({ isLoading: false, isFirstLoading: false })
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    }
  },

  handleAddReport() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')

    if (!patient) {
      wx.showModal({
        title: '需要创建患者',
        content: '请先创建患者档案，才能添加报告',
        confirmText: '去创建',
        confirmColor: '#14b8a6',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/patient-create/patient-create' })
          }
        }
      })
      return
    }

    wx.navigateTo({ url: '/pages/report-upload/report-upload' })
  },

  handleReportClick(e) {
    const reportId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/report-detail/report-detail?id=${reportId}` })
  },

  handleDeleteReport(e) {
    const reportId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这份报告吗？',
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await api.reports.delete(reportId)
            if (result.code === 0) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              this.loadData()
            } else {
              wx.showToast({ title: result.message || '删除失败', icon: 'none' })
            }
          } catch (error) {
            wx.showToast({ title: '删除失败，请重试', icon: 'none' })
          }
        }
      }
    })
  },

  handleQuickAccess(e) {
    const path = e.currentTarget.dataset.path
    wx.switchTab({ url: path })
  },

  toggleReportsExpand() {
    const { reports, reportsExpanded } = this.data
    this.setData({
      reportsExpanded: !reportsExpanded,
      displayReports: !reportsExpanded ? reports : reports.slice(0, 5)
    })
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  toggleAgreement() {
    this.setData({ agreedToTerms: !this.data.agreedToTerms })
  },

  goToAgreement(e) {
    const tab = e.currentTarget.dataset.tab || 'terms'
    wx.navigateTo({ url: `/pages/agreement/agreement?tab=${tab}` })
  },

  showPasswordModal(user, resolve) {
    this._passwordModalUser = user
    this._passwordModalResolve = resolve
    this.setData({
      showPasswordModal: true,
      passwordModalValue: '',
      passwordModalVisible: false,
      passwordModalError: ''
    })
  },

  onPasswordModalInput(e) {
    this.setData({ passwordModalValue: e.detail.value, passwordModalError: '' })
  },

  togglePasswordModalVisible() {
    this.setData({ passwordModalVisible: !this.data.passwordModalVisible })
  },

  async handlePasswordModalConfirm() {
    const { passwordModalValue } = this.data
    const passwordModalUser = this._passwordModalUser
    const passwordModalResolve = this._passwordModalResolve

    if (!passwordModalValue) {
      this.setData({ passwordModalError: '请输入密码' })
      return
    }

    if (!passwordModalUser) {
      this.setData({ showPasswordModal: false, passwordModalError: '' })
      return
    }

    try {
      this.setData({ passwordModalError: '' })
      wx.showLoading({ title: '验证中...' })
      const verifyRes = await api.auth.verifyPassword({
        userId: passwordModalUser._id || passwordModalUser.user_id,
        password: passwordModalValue
      })
      wx.hideLoading()

      if (verifyRes.code === 0 && verifyRes.data && verifyRes.data.valid) {
        this.setData({ showPasswordModal: false })
        passwordModalResolve(true)
      } else if (verifyRes.code === 0 && verifyRes.data && !verifyRes.data.valid) {
        this.setData({ passwordModalError: '密码错误，请重新输入', passwordModalValue: '' })
      } else {
        this.setData({ passwordModalError: verifyRes.message || '验证失败，请重试' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('密码验证异常:', error)
      this.setData({ passwordModalError: '网络异常，请检查网络后重试' })
    }
  },

  handlePasswordModalForgot() {
    const passwordModalResolve = this._passwordModalResolve
    const passwordModalUser = this._passwordModalUser
    this.setData({ showPasswordModal: false })

    if (passwordModalUser) {
      wx.setStorageSync('_tempLoginUser', passwordModalUser)
    }

    wx.navigateTo({ url: '/pages/reset-password/reset-password?mode=security' })
    if (passwordModalResolve) passwordModalResolve(false)
  },

  handlePasswordModalCancel() {
    const passwordModalResolve = this._passwordModalResolve
    this.setData({ showPasswordModal: false })
    if (passwordModalResolve) passwordModalResolve(false)
  }
})
