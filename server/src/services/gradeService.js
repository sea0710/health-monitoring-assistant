const GRADE_RULES = {
  'WBC': {
    normal: { min: 4.0, max: 10.0 },
    I: { min: 3.0, max: 4.0 },
    II: { min: 2.0, max: 3.0 },
    III: { min: 1.0, max: 2.0 },
    IV: { min: 0, max: 1.0 }
  },
  'NEUT#': {
    normal: { min: 1.5, max: 7.5 },
    I: { min: 1.0, max: 1.5 },
    II: { min: 0.5, max: 1.0 },
    III: { min: 0.1, max: 0.5 },
    IV: { min: 0, max: 0.1 }
  },
  'HGB': {
    male: {
      normal: { min: 120, max: 160 },
      I: { min: 100, max: 120 },
      II: { min: 80, max: 100 },
      III: { min: 65, max: 80 },
      IV: { min: 0, max: 65 }
    },
    female: {
      normal: { min: 110, max: 150 },
      I: { min: 90, max: 110 },
      II: { min: 80, max: 100 },
      III: { min: 65, max: 80 },
      IV: { min: 0, max: 65 }
    }
  },
  'PLT': {
    normal: { min: 100, max: 300 },
    I: { min: 75, max: 100 },
    II: { min: 50, max: 75 },
    III: { min: 25, max: 50 },
    IV: { min: 0, max: 25 }
  }
}

const calculateGrade = (indicatorCode, testValue, referenceMin, referenceMax, gender = 'male') => {
  const value = parseFloat(testValue)

  if (isNaN(value)) {
    return { level: 'normal', is_abnormal: false }
  }

  const rules = GRADE_RULES[indicatorCode]
  if (!rules) {
    return { level: 'normal', is_abnormal: false, note: '未知指标' }
  }

  // 先判断分级（骨髓抑制分级优先于参考范围判断）
  let gradeLevel = null
  let isAbnormal = false
  
  if (indicatorCode === 'HGB') {
    const hgbRules = rules[gender] || rules.male
    
    // 检查是否低于正常值（骨髓抑制只看降低）
    if (value < hgbRules.normal.min) {
      isAbnormal = true
      // 从高到低检查分级
      if (value >= hgbRules.I.min) {
        gradeLevel = 'I'
      } else if (value >= hgbRules.II.min) {
        gradeLevel = 'II'
      } else if (value >= hgbRules.III.min) {
        gradeLevel = 'III'
      } else {
        gradeLevel = 'IV'
      }
    } else if (value > hgbRules.normal.max) {
      // 偏高不算骨髓抑制异常
      return { level: 'normal', is_abnormal: false, note: '指标偏高' }
    }
  } else {
    // WBC, NEUT#, PLT 的判断逻辑
    // 检查是否低于正常值（骨髓抑制只看降低）
    if (value < rules.normal.min) {
      isAbnormal = true
      // 从高到低检查分级
      if (value >= rules.I.min) {
        gradeLevel = 'I'
      } else if (value >= rules.II.min) {
        gradeLevel = 'II'
      } else if (value >= rules.III.min) {
        gradeLevel = 'III'
      } else {
        gradeLevel = 'IV'
      }
    } else if (value > rules.normal.max) {
      // 偏高不算骨髓抑制异常
      return { level: 'normal', is_abnormal: false, note: '指标偏高' }
    }
  }

  if (gradeLevel) {
    return { level: gradeLevel, is_abnormal: isAbnormal }
  }

  return { level: 'normal', is_abnormal: false }
}

const getGradeInfo = (level) => {
  const gradeInfo = {
    normal: { name: '正常', color: '#22c55e', description: '指标正常，按常规监测' },
    warning: { name: 'Ⅰ度', color: '#f59e0b', description: '居家监测，定期复查' },
    danger: { name: 'Ⅱ-Ⅲ度', color: '#f97316', description: '建议咨询医生，遵医嘱干预' },
    critical: { name: 'Ⅳ度', color: '#dc2626', description: '立即就医，紧急处理' }
  }
  return gradeInfo[level] || gradeInfo.normal
}

const TREATMENT_PRINCIPLES = {
  normal: {
    principle: '指标正常，继续保持',
    recheck: '建议定期复查',
    warning: []
  },
  warning: {
    principle: '轻度骨髓抑制，建议观察',
    recheck: '建议7-10天后复查',
    warning: ['注意休息', '避免感染', '保持营养均衡']
  },
  danger: {
    principle: '中度骨髓抑制，建议就医',
    recheck: '建议3-5天后复查',
    warning: ['如出现发热，请立即就医', '注意口腔卫生', '避免剧烈活动']
  },
  critical: {
    principle: '重度骨髓抑制，必须就医',
    recheck: '建议立即就医复查',
    warning: ['如出现发热、出血，请立即就医', '避免剧烈活动', '注意观察皮肤黏膜出血']
  }
}

const generateOverallRisk = (indicators) => {
  const abnormalIndicators = indicators.filter(i => i.is_abnormal)
  
  if (abnormalIndicators.length === 0) {
    return {
      level: '正常',
      conclusion: '各项指标正常，未见明显异常',
      severity: 0
    }
  }
  
  const levelMap = { 'warning': 1, 'danger': 2, 'critical': 3 }
  const maxLevel = Math.max(...abnormalIndicators.map(i => levelMap[i.level] || 0))
  
  const levelNames = { 1: 'Ⅰ度', 2: 'Ⅱ-Ⅲ度', 3: 'Ⅳ度' }
  const levelSeverity = { 1: '轻度', 2: '中度', 3: '重度' }
  
  return {
    level: levelNames[maxLevel],
    conclusion: `存在${levelNames[maxLevel]}骨髓抑制风险`,
    severity: maxLevel,
    description: levelSeverity[maxLevel]
  }
}

module.exports = {
  GRADE_RULES,
  calculateGrade,
  getGradeInfo,
  TREATMENT_PRINCIPLES,
  generateOverallRisk
}
