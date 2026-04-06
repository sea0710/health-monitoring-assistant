const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { INDICATORS } = require('../../utils/constants')

// 分级参考数据：处理原则及出院医嘱
const indicatorGradeConfig = [
  {
    code: 'WBC',
    unit: '×10⁹/L',
    grades: [
      { level: 'normal', range: { min: 3.5 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 3.0, max: 3.49 }, principle: '轻度减少，观察即可，注意预防感染' },
      { level: 'danger2', range: { min: 2.0, max: 2.99 }, principle: '中度减少，需对症处理，考虑使用升白药物' },
      { level: 'danger3', range: { min: 1.0, max: 1.99 }, principle: '重度减少，必须使用升白针，密切监测', dischargeAdvice: '若白细胞<2.0×10⁹/L 或 中性粒细胞<1.0×10⁹/L，立即皮下注射人粒细胞刺激因子 100μg，每日一次。连续注射3天后复查血常规，持续用药直至白细胞回升至 9.5×10⁹/L 以上' },
      { level: 'critical', range: { max: 1.0 }, principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', dischargeAdvice: '若白细胞<1.0×10⁹/L (或中性粒细胞<0.5×10⁹/L)，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查' },
    ],
  },
  {
    code: 'NEUT#',
    unit: '×10⁹/L',
    grades: [
      { level: 'normal', range: { min: 1.8 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 1.5, max: 1.79 }, principle: '轻度减少，观察即可，注意感染预防' },
      { level: 'danger2', range: { min: 1.0, max: 1.49 }, principle: '中度减少，需对症处理，考虑使用升白药物' },
      { level: 'danger3', range: { min: 0.5, max: 0.99 }, principle: '重度减少，必须使用升白针，密切监测', dischargeAdvice: '若中性粒细胞<1.0×10⁹/L，立即皮下注射人粒细胞刺激因子 100μg，每日一次。连续注射3天后复查血常规，持续用药直至白细胞回升至 9.5×10⁹/L 以上' },
      { level: 'critical', range: { max: 0.5 }, principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', dischargeAdvice: '若中性粒细胞<0.5×10⁹/L，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查' },
    ],
  },
  {
    code: 'PLT',
    unit: '×10⁹/L',
    grades: [
      { level: 'normal', range: { min: 125 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 100, max: 124 }, principle: '轻度减少，观察即可' },
      { level: 'danger2', range: { min: 50, max: 99 }, principle: '中度减少，需对症处理，考虑使用升血小板药物' },
      { level: 'danger3', range: { min: 25, max: 49 }, principle: '重度减少，必须使用升血小板药物，密切监测', dischargeAdvice: '请皮下注射血小板生成素 1ml 或 白介素-11 1.5mg，每日一次，连续3天后再次复查血常规，直到血小板上升至 70.0×10⁹/L 以上' },
      { level: 'critical', range: { max: 25 }, principle: '极重度减少，立即给予血小板输注及止血药物，预防出血', dischargeAdvice: '若血小板<20.0×10⁹/L属于血小板减少出血危象，应尽快给予血小板输注及应用止血药物治疗' },
    ],
  },
  {
    code: 'HGB',
    unit: 'g/L',
    grades: [
      { level: 'normal', range: { min: 130 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 95, max: 129 }, principle: '轻度减少，观察即可，注意休息' },
      { level: 'danger2', range: { min: 80, max: 94 }, principle: '中度减少，需对症处理，考虑使用升红药物', dischargeAdvice: '若血红蛋白<100g/L，除外出血等原因后，可皮下注射促红细胞生成素' },
      { level: 'danger3', range: { min: 65, max: 79 }, principle: '重度减少，必须使用升红药物，密切监测' },
      { level: 'critical', range: { max: 65 }, principle: '极重度减少，立即输血治疗，预防心衰', dischargeAdvice: '若贫血严重（如Hb<60g/L）或有明显心慌、气短等症状，必要时输血治疗' },
    ],
  },
]

// 根据指标值计算异常等级
function calculateLevel(code, value) {
  const config = indicatorGradeConfig.find(c => c.code === code)
  if (!config) return { level: 'normal', isAbnormal: false, advice: null }

  for (const grade of config.grades) {
    const { min, max } = grade.range
    let matched = false
    
    if (min !== undefined && max !== undefined) {
      matched = value >= min && value <= max
    } else if (min !== undefined) {
      matched = value >= min
    } else if (max !== undefined) {
      matched = value < max
    }
    
    if (matched) {
      return {
        level: grade.level,
        isAbnormal: grade.level !== 'normal',
        advice: {
          principle: grade.principle,
          dischargeAdvice: grade.dischargeAdvice
        }
      }
    }
  }
  
  return { level: 'normal', isAbnormal: false, advice: null }
}

// 获取等级文本
function getLevelText(level) {
  const levelTextMap = {
    'normal': '正常',
    'warning': 'Ⅰ度',
    'danger2': 'Ⅱ度',
    'danger3': 'Ⅲ度',
    'critical': 'Ⅳ度'
  }
  return levelTextMap[level] || '正常'
}

// 获取等级CSS类名
function getLevelClass(level) {
  if (level === 'normal') return 'normal'
  if (level === 'warning') return 'warning'
  if (level === 'danger2' || level === 'danger3') return 'danger'
  if (level === 'critical') return 'critical'
  return 'normal'
}

// 获取等级图标
function getLevelIcon(hasAbnormal, maxLevel) {
  if (!hasAbnormal) return '✓'
  return '!'
}

// 4项核心指标代码
const coreIndicatorCodes = ['WBC', 'NEUT#', 'PLT', 'HGB']

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
          .filter(item => coreIndicatorCodes.includes(item.indicator_code))
          .sort((a, b) => coreIndicatorCodes.indexOf(a.indicator_code) - coreIndicatorCodes.indexOf(b.indicator_code))
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
          .filter(item => !coreIndicatorCodes.includes(item.indicator_code))
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
