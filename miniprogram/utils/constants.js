const INDICATORS = [
  { code: 'WBC', name: '白细胞计数', unit: '×10⁹/L', min: 4.0, max: 10.0 },
  { code: 'NEUT#', name: '中性粒细胞绝对值', unit: '×10⁹/L', min: 2.0, max: 7.0 },
  { code: 'NEUT%', name: '中性粒细胞百分比', unit: '%', min: 50, max: 70 },
  { code: 'RBC', name: '红细胞计数', unit: '×10¹²/L', min: 3.5, max: 5.5 },
  { code: 'HGB', name: '血红蛋白', unit: 'g/L', min: 110, max: 160 },
  { code: 'PLT', name: '血小板计数', unit: '×10⁹/L', min: 100, max: 300 }
]

const GRADE_LEVELS = {
  NORMAL: { level: 'normal', name: '正常', color: '#22c55e' },
  I: { level: 'I', name: 'Ⅰ度', color: '#f59e0b' },
  II: { level: 'II', name: 'Ⅱ度', color: '#f97316' },
  III: { level: 'III', name: 'Ⅲ度', color: '#ea580c' },
  IV: { level: 'IV', name: 'Ⅳ度', color: '#dc2626' }
}

const DISCLAIMER_TEXT = '本工具仅供内部测试与健康科普参考，不构成任何诊疗建议，不能替代执业医师的专业判断'

const STORAGE_KEYS = {
  TOKEN: '__bcm_token',
  USER_INFO: '__bcm_userInfo',
  PATIENT_INFO: '__bcm_patientInfo',
  REPORTS: '__bcm_reports',
  INDICATORS: '__bcm_indicators',
  REMINDERS: '__bcm_reminders'
}

module.exports = {
  INDICATORS,
  GRADE_LEVELS,
  DISCLAIMER_TEXT,
  STORAGE_KEYS
}
