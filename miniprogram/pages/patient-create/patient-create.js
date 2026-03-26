const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

Page({
  data: {
    name: '',
    gender: '',
    birthday: '',
    tumorType: '',
    treatmentPlan: '',
    chemotherapyCycles: '',
    lastChemoEndDate: '',
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
        gender: patient.gender || '',
        birthday: patient.birthday || '',
        tumorType: patient.tumor_type || '',
        treatmentPlan: patient.treatment_plan || '',
        chemotherapyCycles: patient.chemotherapy_cycles || '',
        lastChemoEndDate: patient.last_chemo_end_date || ''
      })
    }
  },

  handleBack() {
    wx.navigateBack()
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onGenderSelect(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({ gender })
  },

  onBirthdayChange(e) {
    this.setData({ birthday: e.detail.value })
  },

  onTumorTypeInput(e) {
    this.setData({ tumorType: e.detail.value })
  },

  onTreatmentPlanInput(e) {
    this.setData({ treatmentPlan: e.detail.value })
  },

  onChemotherapyCyclesInput(e) {
    this.setData({ chemotherapyCycles: e.detail.value })
  },

  onLastChemoEndDateChange(e) {
    this.setData({ lastChemoEndDate: e.detail.value })
  },

  async handleSave() {
    const { name, gender, birthday, tumorType, treatmentPlan, chemotherapyCycles, lastChemoEndDate } = this.data

    if (!name.trim()) {
      showToast('请输入患者姓名')
      return
    }

    this.setData({ isLoading: true })
    showLoading('保存中...')

    try {
      const app = getApp()
      const userId = app.globalData.userInfo?.user_id

      const res = await api.patients.create({
        name: name.trim(),
        gender,
        birthday,
        tumor_type: tumorType,
        treatment_plan: treatmentPlan,
        chemotherapy_cycles: chemotherapyCycles ? parseInt(chemotherapyCycles) : null,
        last_chemo_end_date: lastChemoEndDate
      })

      if (res.code === 0) {
        app.setPatientInfo(res.data)
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
