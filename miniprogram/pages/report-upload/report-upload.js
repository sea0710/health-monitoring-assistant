const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { INDICATORS } = require('../../utils/constants')

Page({
  data: {
    previewImage: '',
    isRecognizing: false,
    isSaving: false,
    ocrResult: null,
    testTime: '',
    hospital: '',
    indicators: []
  },

  onLoad() {
    this.initIndicators()
    this.setData({ testTime: this.formatDate(new Date()) })
  },

  initIndicators() {
    const indicators = INDICATORS.map(ind => ({
      code: ind.code,
      name: ind.name,
      unit: ind.unit,
      value: '',
      referenceMin: ind.min,
      referenceMax: ind.max,
      isAbnormal: false,
      abnormalLevel: '',
      abnormalLevelName: ''
    }))
    this.setData({ indicators })
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  handleBack() {
    wx.navigateBack()
  },

  handleChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ previewImage: tempFilePath })
      }
    })
  },

  async handleOCR() {
    const { previewImage } = this.data
    
    if (!previewImage) {
      showToast('请先上传图片')
      return
    }

    this.setData({ isRecognizing: true })
    showLoading('识别中...')

    try {
      const res = await api.ocr.recognize(previewImage)
      
      if (res.code === 0) {
        this.parseOCRResult(res.data)
        showToast('识别成功')
      } else {
        showToast(res.message || '识别失败')
      }
    } catch (error) {
      console.error('OCR识别失败:', error)
      showToast('识别失败，请重试')
    } finally {
      hideLoading()
      this.setData({ isRecognizing: false })
    }
  },

  parseOCRResult(data) {
    const indicators = this.data.indicators.map(ind => {
      let value = ''
      switch (ind.code) {
        case 'WBC':
          value = data.wbc_value || ''
          break
        case 'NEUT#':
          value = data.neut_abs_value || ''
          break
        case 'NEUT%':
          value = data.neut_percent_value || ''
          break
        case 'RBC':
          value = data.rbc_value || ''
          break
        case 'HGB':
          value = data.hgb_value || ''
          break
        case 'PLT':
          value = data.plt_value || ''
          break
      }
      
      const numValue = parseFloat(value)
      const isAbnormal = !isNaN(numValue) && (numValue < ind.referenceMin || numValue > ind.referenceMax)
      
      return {
        ...ind,
        value,
        isAbnormal
      }
    })

    this.setData({
      ocrResult: data,
      testTime: data.test_time || this.formatDate(new Date()),
      hospital: data.hospital || '',
      indicators
    })
  },

  onTestTimeChange(e) {
    this.setData({ testTime: e.detail.value })
  },

  onHospitalInput(e) {
    this.setData({ hospital: e.detail.value })
  },

  onIndicatorValueInput(e) {
    const code = e.currentTarget.dataset.code
    const value = e.detail.value
    
    const indicators = this.data.indicators.map(ind => {
      if (ind.code === code) {
        const numValue = parseFloat(value)
        const isAbnormal = !isNaN(numValue) && (numValue < ind.referenceMin || numValue > ind.referenceMax)
        return { ...ind, value, isAbnormal }
      }
      return ind
    })
    
    this.setData({ indicators })
  },

  async handleSave() {
    const { testTime, hospital, indicators, previewImage } = this.data
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')

    if (!patient) {
      showToast('请先创建患者档案')
      return
    }

    const validIndicators = indicators.filter(ind => ind.value)
    if (validIndicators.length === 0) {
      showToast('请至少填写一项指标')
      return
    }

    this.setData({ isSaving: true })
    showLoading('保存中...')

    try {
      const res = await api.reports.create({
        patient_id: patient.patient_id,
        test_time: testTime,
        test_hospital: hospital,
        raw_image_url: previewImage,
        indicators: validIndicators.map(ind => ({
          indicator_code: ind.code,
          indicator_name: ind.name,
          test_value: parseFloat(ind.value),
          reference_min: ind.referenceMin,
          reference_max: ind.referenceMax,
          unit: ind.unit
        }))
      })

      if (res.code === 0) {
        showToast('保存成功')
        setTimeout(() => {
          wx.navigateBack()
        }, 1000)
      } else {
        showToast(res.message || '保存失败')
      }
    } catch (error) {
      console.error('保存报告失败:', error)
      showToast('保存失败，请重试')
    } finally {
      hideLoading()
      this.setData({ isSaving: false })
    }
  },

  handleReset() {
    this.setData({
      previewImage: '',
      ocrResult: null,
      hospital: ''
    })
    this.initIndicators()
  }
})
