const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

Page({
  data: {
    name: '',
    gender: '',
    isLoading: false
  },

  onLoad(options) {
    if (options.edit === 'true') {
      this.loadPatientData()
    }
  },

  loadPatientData() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    
    if (patient) {
      this.setData({
        name: patient.name || '',
        gender: patient.gender || ''
      })
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onGenderSelect(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({ gender })
  },

  async handleSave() {
    const { name, gender } = this.data

    if (!name.trim()) {
      showToast('请输入患者姓名')
      return
    }

    if (!gender) {
      showToast('请选择性别')
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
          wx.switchTab({ url: '/pages/home/home' })
        }, 1000)
        return
      }

      const res = await api.patients.create({
        user_id: userId,
        name: name.trim(),
        gender
      })

      if (res.code === 0) {
        // 保存完整的患者信息，包括 name 和 gender
        const patientInfo = {
          patient_id: res.data.patient_id,
          name: name.trim(),
          gender: gender
        }
        app.setPatientInfo(patientInfo)
        showToast('保存成功')
        
        setTimeout(() => {
          wx.switchTab({ url: '/pages/home/home' })
        }, 1000)
      } else {
        showToast(res.message || '保存失败')
      }
    } catch (error) {
      console.error('保存患者档案失败:', error)
      showToast('保存失败，请重试')
    } finally {
      hideLoading()
      this.setData({ isLoading: false })
    }
  }
})
