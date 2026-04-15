const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { INDICATORS, calculateAbnormalLevel } = require('../../utils/constants')

const KEY_INDICATORS = ['WBC', 'HGB', 'PLT', 'NEUT#']

Page({
  data: {
    reportId: '',
    report: null,
    testTime: '',
    hospital: '',
    indicators: [],
    isSaving: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ reportId: options.id })
      this.loadReportDetail(options.id)
    }
  },

  async loadReportDetail(reportId) {
    showLoading('加载中...')
    
    try {
      const res = await api.reports.detail(reportId)
      
      if (res.code === 0) {
        const report = res.data.report
        const existingIndicators = res.data.indicators || []
        
        // 创建已存在指标的映射
        const existingMap = {}
        existingIndicators.forEach(item => {
          existingMap[item.indicator_code] = item
        })
        
        // 初始化所有指标，包括未保存的
        const allIndicators = INDICATORS.map(ind => {
          const existing = existingMap[ind.code]
          const indicatorConfig = INDICATORS.find(i => i.code === ind.code)
          
          return {
            _id: existing?._id || `new_${ind.code}`,
            indicator_id: existing?.indicator_id || `new_${ind.code}`,
            indicator_code: ind.code,
            indicator_name: ind.name,
            test_value: existing?.test_value || '',
            reference_min: indicatorConfig?.min || ind.min,
            reference_max: indicatorConfig?.max || ind.max,
            unit: ind.unit,
            is_abnormal: existing?.is_abnormal || false,
            abnormal_level: existing?.abnormal_level || 'normal',
            isKey: KEY_INDICATORS.includes(ind.code)
          }
        })
        
        this.setData({
          report,
          testTime: report.test_time,
          hospital: report.test_hospital || '',
          indicators: allIndicators
        })
      } else {
        showToast(res.message || '加载失败')
      }
    } catch (error) {
      console.error('加载报告详情失败:', error)
      showToast('加载失败，请重试')
    } finally {
      hideLoading()
    }
  },

  onTestTimeChange(e) {
    this.setData({ testTime: e.detail.value })
  },

  onHospitalInput(e) {
    this.setData({ hospital: e.detail.value })
  },

  onIndicatorValueInput(e) {
    const id = e.currentTarget.dataset.id
    const value = e.detail.value
    
    const indicators = this.data.indicators.map(ind => {
      if (ind.indicator_id === id || ind._id === id) {
        return {
          ...ind,
          test_value: value
        }
      }
      return ind
    })
    
    this.setData({ indicators })
  },

  async handleSave() {
    const { reportId, testTime, hospital, indicators } = this.data

    // 检查4个关键指标是否都已填写
    const keyIndicatorsData = indicators.filter(ind => ind.isKey)
    const missingKeyIndicators = keyIndicatorsData.filter(ind => !ind.test_value)
    
    if (missingKeyIndicators.length > 0) {
      const missingNames = missingKeyIndicators.map(ind => ind.indicator_name).join('、')
      showToast(`请填写关键指标：${missingNames}`)
      return
    }

    // 过滤出有值的指标
    const validIndicators = indicators.filter(ind => ind.test_value !== '' && ind.test_value !== undefined)

    this.setData({ isSaving: true })
    showLoading('保存中...')

    try {
      const res = await api.reports.update({
        reportId: reportId,
        test_time: testTime,
        test_hospital: hospital,
        indicators: validIndicators.map(ind => {
          const { is_abnormal, abnormal_level } = calculateAbnormalLevel(ind.indicator_code, ind.test_value)
          return {
            indicator_code: ind.indicator_code,
            indicator_name: ind.indicator_name,
            test_value: parseFloat(ind.test_value),
            reference_min: ind.reference_min,
            reference_max: ind.reference_max,
            unit: ind.unit,
            is_abnormal,
            abnormal_level
          }
        })
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
  }
})
