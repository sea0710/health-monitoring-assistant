const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { INDICATORS, calculateAbnormalLevel } = require('../../utils/constants')

const KEY_INDICATORS = ['WBC', 'HGB', 'PLT', 'NEUT#']

Page({
  data: {
    previewImage: '',
    fileID: '',
    isRecognizing: false,
    isSaving: false,
    ocrResult: null,
    testTime: '',
    hospital: '',
    indicators: []
  },

  onLoad() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')

    if (!patient) {
      wx.showModal({
        title: '需要创建患者',
        content: '请先创建患者档案，才能上传报告',
        confirmText: '去创建',
        cancelText: '返回',
        confirmColor: '#14b8a6',
        cancelColor: '#999',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/patient-create/patient-create' })
          }
        },
        complete: () => {
          wx.navigateBack()
        }
      })
      return
    }

    this.initIndicators()
    this.setData({ testTime: this.formatDate(new Date()) })
  },

  initIndicators() {
    const indicators = INDICATORS.map(ind => ({
      code: ind.code,
      name: ind.name,
      unit: ind.unit,
      value: '',
      isKey: KEY_INDICATORS.includes(ind.code)
    }))
    this.setData({ indicators })
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  async handleChooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      })
      
      const tempFilePath = res.tempFiles[0].tempFilePath
      this.setData({ 
        previewImage: tempFilePath,
        fileID: ''
      })
      
      await this.handleOCR()
    } catch (error) {
      // 用户取消选择图片
    }
  },

  async handleOCR() {
    const { previewImage } = this.data
    
    if (!previewImage) {
      showToast('请先上传图片')
      return
    }

    this.setData({ isRecognizing: true })
    showLoading('识别中，请稍等')

    try {
      const ext = previewImage.split('.').pop() || 'jpg'
      const cloudPath = `reports/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: previewImage
      })
      
      if (!uploadRes.fileID) {
        throw new Error('上传失败')
      }
      
      this.setData({ fileID: uploadRes.fileID })
      
      const res = await api.ocr.recognize(uploadRes.fileID)
      
      if (res.code === 0) {
        hideLoading()
        this.parseOCRResult(res.data)
        showToast('识别成功')
      } else {
        hideLoading()
        showToast(res.message || '识别失败')
      }
    } catch (error) {
      console.error('OCR识别失败:', error)
      hideLoading()
      showToast('识别失败，请重试')
    } finally {
      this.setData({ isRecognizing: false })
    }
  },

  parseOCRResult(data) {
    if (data.indicators && data.indicators.length > 0) {
      const indicatorsMap = {}
      data.indicators.forEach(ind => {
        indicatorsMap[ind.indicator_code] = ind
      })
      
      const indicators = this.data.indicators.map(ind => {
        const ocrInd = indicatorsMap[ind.code]
        if (ocrInd) {
          const value = String(ocrInd.test_value)
          return {
            ...ind,
            value
          }
        }
        return ind
      })
      
      this.setData({
        ocrResult: data,
        testTime: data.test_time || this.formatDate(new Date()),
        hospital: data.test_hospital || '',
        indicators
      })
    } else {
      // OCR字段名映射
      const fieldMapping = {
        'WBC': 'wbc_value',
        'NEUT#': 'neut_abs_value',
        'NEUT%': 'neut_percent_value',
        'LYMPH#': 'lymph_abs_value',
        'LYMPH%': 'lymph_percent_value',
        'MONO#': 'mono_abs_value',
        'MONO%': 'mono_percent_value',
        'EOS#': 'eos_abs_value',
        'EOS%': 'eos_percent_value',
        'BASO#': 'baso_abs_value',
        'BASO%': 'baso_percent_value',
        'RBC': 'rbc_value',
        'HGB': 'hgb_value',
        'HCT': 'hct_value',
        'MCV': 'mcv_value',
        'MCH': 'mch_value',
        'MCHC': 'mchc_value',
        'RDW-SD': 'rdw_sd_value',
        'RDW-CV': 'rdw_cv_value',
        'PLT': 'plt_value',
        'PDW': 'pdw_value',
        'MPV': 'mpv_value',
        'P-LCR': 'p_lcr_value',
        'TCT': 'tct_value',
        'CRP': 'crp_value'
      }
      
      const indicators = this.data.indicators.map(ind => {
        const fieldName = fieldMapping[ind.code]
        const value = fieldName && data[fieldName] ? String(data[fieldName]) : ''
        
        return {
          ...ind,
          value
        }
      })

      this.setData({
        ocrResult: data,
        testTime: data.test_time || this.formatDate(new Date()),
        hospital: data.test_hospital || '',
        indicators
      })
    }
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
        return { ...ind, value }
      }
      return ind
    })
    
    this.setData({ indicators })
  },

  async handleSave() {
    const { testTime, hospital, indicators, previewImage, fileID } = this.data
    const app = getApp()
    let patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')

    if (!patient) {
      showToast('请先创建患者档案')
      return
    }

    let patientId = patient._id || patient.patient_id

    if (!patientId) {
      try {
        const { api } = require('../../utils/api')
        const userId = userInfo?._id || userInfo?.user_id

        if (userId) {
          const res = await api.patients.get(userId)

          if (res.data && res.data._id) {
            patient = res.data
            app.setPatientInfo(patient)
            patientId = patient._id
          }
        }
      } catch (e) {
        console.error('重新加载患者信息失败:', e)
      }

      if (!patientId) {
        showToast('患者信息异常，请在个人设置中重新创建')
        return
      }
    }

    const userId = userInfo?._id || userInfo?.user_id

    if (!userInfo || !userId) {
      showToast('用户信息不完整，请重新登录')
      return
    }

    // 检查4个关键指标是否都已填写
    const KEY_INDICATORS = ['WBC', 'HGB', 'PLT', 'NEUT#']
    const keyIndicatorsData = indicators.filter(ind => KEY_INDICATORS.includes(ind.code))
    const missingKeyIndicators = keyIndicatorsData.filter(ind => !ind.value)
    
    if (missingKeyIndicators.length > 0) {
      const missingNames = missingKeyIndicators.map(ind => {
        const config = INDICATORS.find(i => i.code === ind.code)
        return config?.name || ind.code
      }).join('、')
      showToast(`请填写关键指标：${missingNames}`)
      return
    }

    // 过滤出有值的指标
    const validIndicators = indicators.filter(ind => ind.value)

    this.setData({ isSaving: true })
    showLoading('保存中...')

    try {
      const reportData = {
        user_id: userId,
        patient_id: patientId,
        report_type: '血常规',
        test_time: testTime,
        test_hospital: hospital,
        raw_image_url: fileID || previewImage,
        indicators: validIndicators.map(ind => {
          const refIndicator = INDICATORS.find(i => i.code === ind.code)
          const { is_abnormal, abnormal_level } = calculateAbnormalLevel(ind.code, ind.value)
          return {
            indicator_code: ind.code,
            indicator_name: ind.name,
            test_value: parseFloat(ind.value),
            reference_min: refIndicator?.min || 0,
            reference_max: refIndicator?.max || 0,
            unit: ind.unit,
            is_abnormal,
            abnormal_level
          }
        })
      }
      
      const res = await api.reports.create(reportData)

      if (res.code === 0) {
        showToast('保存成功')
        const reportId = res.data.report_id
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/report-detail/report-detail?id=${reportId}`
          })
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
      fileID: '',
      ocrResult: null,
      hospital: ''
    })
    this.initIndicators()
  }
})
