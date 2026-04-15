const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { INDICATORS, calculateLevel, getLevelText, getLevelClass, getLevelIcon, CORE_INDICATOR_CODES } = require('../../utils/constants')

Page({
  data: {
    reportId: '',
    report: null,
    coreIndicators: [],
    otherIndicators: [],
    hasAbnormal: false,
    maxLevel: 'normal',
    levelText: '正常',
    levelIcon: '✓',
    showOtherIndicators: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ reportId: options.id })
    }
  },

  onShow() {
    if (this.data.reportId) {
      this.loadReportDetail(this.data.reportId)
    }
  },

  async loadReportDetail(reportId) {
    showLoading('加载中...')
    
    try {
      const res = await api.reports.detail(reportId)
      
      if (res.code === 0) {
        const report = res.data.report
        const indicators = res.data.indicators || []
        
        // 过滤出核心指标并排序，重新计算异常等级
        const coreIndicators = indicators
          .filter(item => CORE_INDICATOR_CODES.includes(item.indicator_code))
          .sort((a, b) => CORE_INDICATOR_CODES.indexOf(a.indicator_code) - CORE_INDICATOR_CODES.indexOf(b.indicator_code))
          .map(item => {
            // 获取最新的参考范围
            const indicatorConfig = INDICATORS.find(ind => ind.code === item.indicator_code)
            const referenceMin = indicatorConfig?.min || item.reference_min
            const referenceMax = indicatorConfig?.max || item.reference_max
            
            // 根据指标值重新计算异常等级
            const { level, isAbnormal, advice } = calculateLevel(item.indicator_code, item.test_value)
            const levelText = getLevelText(level)
            const levelClass = getLevelClass(level)
            
            return {
              ...item,
              reference_min: referenceMin,
              reference_max: referenceMax,
              abnormal_level: levelClass,
              is_abnormal: isAbnormal,
              levelText,
              advice
            }
          })
        
        // 过滤出其他指标
        const otherIndicators = indicators
          .filter(item => !CORE_INDICATOR_CODES.includes(item.indicator_code))
          .map(item => {
            const indicatorConfig = INDICATORS.find(ind => ind.code === item.indicator_code)
            const referenceMin = indicatorConfig?.min || item.reference_min
            const referenceMax = indicatorConfig?.max || item.reference_max
            
            // 判断是否异常
            const value = parseFloat(item.test_value)
            const isAbnormal = value < referenceMin || value > referenceMax
            
            return {
              ...item,
              reference_min: referenceMin,
              reference_max: referenceMax,
              is_abnormal: isAbnormal,
              statusText: isAbnormal ? '异常' : '正常'
            }
          })
        
        // 计算是否有异常
        const coreAbnormalIndicators = coreIndicators.filter(item => item.is_abnormal)
        const hasAbnormal = coreAbnormalIndicators.length > 0
        
        // 计算最高异常等级
        const maxLevel = this.getMaxAbnormalLevel(coreIndicators)
        const levelText = getLevelText(maxLevel)
        const levelIcon = getLevelIcon(hasAbnormal, maxLevel)
        
        this.setData({
          report,
          coreIndicators,
          otherIndicators,
          hasAbnormal,
          maxLevel: getLevelClass(maxLevel),
          levelText,
          levelIcon
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

  getMaxAbnormalLevel(indicators) {
    if (!indicators || indicators.length === 0) return 'normal'
    
    const levels = indicators.map(i => i.abnormal_level)
    
    if (levels.includes('critical')) return 'critical'
    if (levels.includes('danger')) {
      // 检查是否有danger3
      const hasDanger3 = indicators.some(i => i.levelText === 'Ⅲ度')
      return hasDanger3 ? 'danger3' : 'danger2'
    }
    if (levels.includes('warning')) return 'warning'
    return 'normal'
  },

  handleEdit() {
    const report = this.data.report
    if (report && report._id) {
      wx.navigateTo({
        url: `/pages/report-edit/report-edit?id=${report._id}`
      })
    }
  },

  handleViewTrend() {
    wx.switchTab({
      url: '/pages/trends/trends'
    })
  },

  handleViewReference() {
    wx.switchTab({
      url: '/pages/reference/reference'
    })
  },

  toggleOtherIndicators() {
    this.setData({
      showOtherIndicators: !this.data.showOtherIndicators
    })
  }
})
