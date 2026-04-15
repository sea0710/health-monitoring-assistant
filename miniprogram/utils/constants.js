const INDICATORS = [
  { code: 'WBC', name: '白细胞(WBC)', unit: '×10⁹/L', min: 3.5, max: 9.5 },
  { code: 'NEUT#', name: '中性粒细胞数(NEUT)', unit: '×10⁹/L', min: 1.8, max: 6.3 },
  { code: 'NEUT%', name: '中性粒细胞百分比(NEUT%)', unit: '%', min: 40, max: 75 },
  { code: 'LYMPH#', name: '淋巴细胞数(LYMPH)', unit: '×10⁹/L', min: 1.1, max: 3.2 },
  { code: 'LYMPH%', name: '淋巴细胞百分比(LYMPH%)', unit: '%', min: 20, max: 50 },
  { code: 'MONO#', name: '单核细胞数(MONO)', unit: '×10⁹/L', min: 0.1, max: 0.6 },
  { code: 'MONO%', name: '单核细胞百分比(MONO%)', unit: '%', min: 3, max: 10 },
  { code: 'EOS#', name: '嗜酸性粒细胞数(EOS)', unit: '×10⁹/L', min: 0.02, max: 0.52 },
  { code: 'EOS%', name: '嗜酸性粒细胞百分比(EOS%)', unit: '%', min: 0.4, max: 8 },
  { code: 'BASO#', name: '嗜碱性粒细胞数(BASO)', unit: '×10⁹/L', min: 0, max: 0.06 },
  { code: 'BASO%', name: '嗜碱性粒细胞百分比(BASO%)', unit: '%', min: 0, max: 1 },
  { code: 'RBC', name: '红细胞(RBC)', unit: '×10¹²/L', min: 4.3, max: 5.8 },
  { code: 'HGB', name: '血红蛋白(HGB)', unit: 'g/L', min: 130, max: 175 },
  { code: 'HCT', name: '红细胞压积(HCT)', unit: '%', min: 40, max: 50 },
  { code: 'MCV', name: '平均红细胞体积(MCV)', unit: 'fL', min: 82, max: 100 },
  { code: 'MCH', name: '平均红细胞血红蛋白(MCH)', unit: 'pg', min: 27, max: 34 },
  { code: 'MCHC', name: '平均红细胞血红蛋白浓度(MCHC)', unit: 'g/L', min: 316, max: 354 },
  { code: 'RDW-SD', name: '红细胞分布宽度-SD(RDW-SD)', unit: 'fL', min: 37, max: 51 },
  { code: 'RDW-CV', name: '红细胞分布宽度-CV(RDW-CV)', unit: '%', min: 11.9, max: 14.5 },
  { code: 'PLT', name: '血小板(PLT)', unit: '×10⁹/L', min: 125, max: 350 },
  { code: 'PDW', name: '血小板分布宽度(PDW)', unit: '%', min: 15, max: 17 },
  { code: 'MPV', name: '平均血小板体积(MPV)', unit: 'fL', min: 9, max: 17 },
  { code: 'P-LCR', name: '大血小板比率(P-LCR)', unit: '%', min: 13, max: 43 },
  { code: 'TCT', name: '血小板压积(TCT)', unit: '%', min: 0.1, max: 0.3 },
  { code: 'CRP', name: 'C-反应蛋白(CRP)', unit: 'mg/L', min: 0, max: 10 }
]

const REFERENCE_DATA = [
  {
    code: 'ANC',
    name: '中性粒细胞绝对值（ANC/NEUT#）',
    shortName: '中性粒细胞',
    unit: '×10⁹/L',
    clinicalSignificance: '中性粒细胞是白细胞中最重要的抗感染成分，占白细胞总数的50%-70%，是抵抗细菌感染的主力军。数量下降直接关系到感染风险，尤其是<0.5×10⁹/L时，感染风险急剧增加。',
    careTips: [
      '自我监测：每日早晚测体温，≥37.5℃警惕，≥38.0℃立即就医',
      '生活护理：使用软毛牙刷，避免挖鼻，保持皮肤清洁',
      '避免去人群密集场所，外出佩戴口罩',
      '避免接触感冒、发热患者，保持室内通风',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '≥1.5', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '1.0-1.4', principle: '轻度减少，观察即可，注意感染预防', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '0.5-0.9', principle: '中度减少，需对症处理，考虑使用升白药物', dischargeAdvice: '若中性粒细胞<1.0×10⁹/L，立即皮下注射人粒细胞刺激因子 100μg，每日一次。连续注射3天后复查血常规，持续用药直至白细胞回升至 10.0×10⁹/L 以上', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'III级', range: '0.1-0.4', principle: '重度减少，必须使用升白针，密切监测', dischargeAdvice: '若中性粒细胞<0.5×10⁹/L，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'IV级', range: '<0.1', principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'WBC',
    name: '白细胞计数（WBC）',
    shortName: '白细胞',
    unit: '×10⁹/L',
    clinicalSignificance: '白细胞是免疫系统的重要组成部分，主要负责抵御病原体入侵。化疗期间白细胞减少（骨髓抑制）会增加感染风险。',
    careTips: [
      '保持个人卫生，勤洗手，使用肥皂或免洗洗手液',
      '避免前往人群密集场所，外出佩戴口罩',
      '保持室内通风，室温适宜',
      '避免接触感冒、发热患者',
      '注意饮食卫生，避免生冷、未煮熟的食物',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '≥3.5', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '3.0-3.4', principle: '轻度减少，观察即可，注意预防感染', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '2.0-2.9', principle: '中度减少，需对症处理，考虑使用升白药物', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'III级', range: '1.0-1.9', principle: '重度减少，必须使用升白针，密切监测', dischargeAdvice: '若白细胞<2.0×10⁹/L 或 中性粒细胞<1.0×10⁹/L，立即皮下注射人粒细胞刺激因子 100μg，每日一次。连续注射3天后复查血常规，持续用药直至白细胞回升至 10.0×10⁹/L 以上', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'IV级', range: '<1.0', principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', dischargeAdvice: '若白细胞<1.0×10⁹/L (或中性粒细胞<0.5×10⁹/L)，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'HGB',
    name: '血红蛋白（HGB）',
    shortName: '血红蛋白',
    unit: 'g/L',
    clinicalSignificance: '血红蛋白负责运输氧气到全身各组织。血红蛋白降低会导致贫血，表现为乏力、头晕、气短等症状。',
    careTips: [
      '休息充足，避免剧烈运动和过度劳累',
      '起身时动作缓慢，防止体位性低血压',
      '饮食可适当增加富含铁质的食物（如红肉、菠菜等）',
      '注意保暖，避免受凉',
      '如出现心悸、气短加重，及时就医',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '男≥120/女≥110', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '男90-119/女90-109', principle: '轻度减少，观察即可，注意休息', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '80-100', principle: '中度减少，需对症处理，考虑使用升红药物', dischargeAdvice: '若血红蛋白<100g/L，除外出血等原因后，可皮下注射促红细胞生成素', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'III级', range: '65-79', principle: '重度减少，必须使用升红药物，密切监测', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'IV级', range: '<65', principle: '极重度减少，立即输血治疗，预防心衰', dischargeAdvice: '若贫血严重（如Hb<60g/L）或有明显心慌、气短等症状，必要时输血治疗', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'PLT',
    name: '血小板计数（PLT）',
    shortName: '血小板',
    unit: '×10⁹/L',
    clinicalSignificance: '血小板参与止血和凝血过程。血小板减少会增加出血风险，表现为皮肤瘀斑、牙龈出血等症状。',
    careTips: [
      '避免剧烈运动和可能造成外伤的活动',
      '使用软毛牙刷，避免牙龈出血',
      '避免用力擤鼻、挖鼻',
      '注意观察皮肤有无瘀斑、出血点',
      '如出现严重出血，立即就医',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '≥100', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '75-99', principle: '轻度减少，观察即可', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '50-74', principle: '中度减少，需对症处理，考虑使用升血小板药物', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'III级', range: '25-49', principle: '重度减少，必须使用升血小板药物，密切监测', dischargeAdvice: '请皮下注射血小板生成素 1ml 或 白介素-11 1.5mg，每日一次，连续3天后再次复查血常规，直到血小板上升至 70.0×10⁹/L 以上', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'IV级', range: '<25', principle: '极重度减少，立即给予血小板输注及止血药物，预防出血', dischargeAdvice: '若血小板<20.0×10⁹/L属于血小板减少出血危象，应尽快给予血小板输注及应用止血药物治疗', color: 'bg-critical/10 text-critical' },
    ],
  },
]

const GRADE_LEVELS = {
  NORMAL: { level: 'normal', name: '正常', color: '#22c55e' },
  I: { level: 'I', name: 'Ⅰ度', color: '#f59e0b' },
  II: { level: 'II', name: 'Ⅱ度', color: '#f97316' },
  III: { level: 'III', name: 'Ⅲ度', color: '#f97415' },
  IV: { level: 'IV', name: 'Ⅳ度', color: '#dc2626' }
}

function calculateAbnormalLevel(code, value) {
  if (value === '' || value === undefined || value === null || isNaN(value)) {
    return { is_abnormal: false, abnormal_level: 'normal' }
  }
  const numValue = parseFloat(value)
  const indicator = INDICATORS.find(i => i.code === code)
  if (!indicator) {
    return { is_abnormal: false, abnormal_level: 'normal' }
  }
  const { min, max } = indicator
  if (numValue >= min && numValue <= max) {
    return { is_abnormal: false, abnormal_level: 'normal' }
  }
  if (code === 'WBC') {
    if (numValue >= 3.0) return { is_abnormal: true, abnormal_level: 'warning' }
    if (numValue >= 2.0) return { is_abnormal: true, abnormal_level: 'danger' }
    if (numValue >= 1.0) return { is_abnormal: true, abnormal_level: 'danger' }
    return { is_abnormal: true, abnormal_level: 'critical' }
  }
  if (code === 'NEUT#') {
    if (numValue >= 1.5) return { is_abnormal: true, abnormal_level: 'warning' }
    if (numValue >= 0.5) return { is_abnormal: true, abnormal_level: 'danger' }
    return { is_abnormal: true, abnormal_level: 'critical' }
  }
  if (code === 'HGB') {
    if (numValue >= 95) return { is_abnormal: true, abnormal_level: 'warning' }
    if (numValue >= 65) return { is_abnormal: true, abnormal_level: 'danger' }
    return { is_abnormal: true, abnormal_level: 'critical' }
  }
  if (code === 'PLT') {
    if (numValue >= 100) return { is_abnormal: true, abnormal_level: 'warning' }
    if (numValue >= 25) return { is_abnormal: true, abnormal_level: 'danger' }
    return { is_abnormal: true, abnormal_level: 'critical' }
  }
  return { is_abnormal: true, abnormal_level: 'warning' }
}

// 核心指标代码（6项）
const CORE_INDICATOR_CODES = ['WBC', 'NEUT#', 'NEUT%', 'RBC', 'HGB', 'PLT']

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
    code: 'NEUT%',
    unit: '%',
    grades: [
      { level: 'critical', range: { max: 20 }, principle: '极重度降低，需结合中性粒细胞绝对值综合判断，立即就医' },
      { level: 'danger2', range: { min: 20, max: 29.99 }, principle: '中度降低，需结合中性粒细胞绝对值综合判断，注意感染预防' },
      { level: 'warning', range: { min: 30, max: 39.99 }, principle: '轻度降低，需结合中性粒细胞绝对值综合判断' },
      { level: 'normal', range: { min: 40, max: 75 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 75.01, max: 85 }, principle: '轻度升高，可能提示感染或炎症反应' },
      { level: 'danger2', range: { min: 85.01, max: 90 }, principle: '中度升高，需排查感染原因' },
      { level: 'critical', range: { min: 90.01 }, principle: '重度升高，需紧急排查感染' },
    ],
  },
  {
    code: 'RBC',
    unit: '×10¹²/L',
    grades: [
      { level: 'critical', range: { max: 2.0 }, principle: '极重度减少，需紧急处理' },
      { level: 'danger3', range: { min: 2.0, max: 2.49 }, principle: '重度减少，需密切监测' },
      { level: 'danger2', range: { min: 2.5, max: 2.99 }, principle: '中度减少，需对症处理' },
      { level: 'warning', range: { min: 3.0, max: 4.29 }, principle: '轻度减少，观察即可，注意休息' },
      { level: 'normal', range: { min: 4.3, max: 5.8 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 5.81, max: 6.5 }, principle: '轻度升高，需结合其他指标综合判断' },
      { level: 'danger2', range: { min: 6.51 }, principle: '中度升高，需排查原因' },
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

// 根据指标值计算异常等级（含处理原则和出院医嘱）
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
    'danger': 'Ⅱ-Ⅲ度',
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
  if (level === 'danger' || level === 'danger2' || level === 'danger3') return 'danger'
  if (level === 'critical') return 'critical'
  return 'normal'
}

// 获取等级图标
function getLevelIcon(hasAbnormal, maxLevel) {
  if (!hasAbnormal) return '✓'
  return '!'
}

const SECURITY_QUESTIONS = [
  { id: 1, question: '您的小学学校名称？', hint: '例如：北京市第一小学' },
  { id: 2, question: '您的宠物名字？', hint: '例如：旺财' },
  { id: 3, question: '您母亲的生日？', hint: '格式：YYYYMMDD，例如：19900101' },
  { id: 4, question: '您出生的城市？', hint: '例如：北京' },
  { id: 5, question: '您最喜欢的电影？', hint: '例如：阿甘正传' }
]

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
  REFERENCE_DATA,
  GRADE_LEVELS,
  SECURITY_QUESTIONS,
  DISCLAIMER_TEXT,
  STORAGE_KEYS,
  CORE_INDICATOR_CODES,
  indicatorGradeConfig,
  calculateAbnormalLevel,
  calculateLevel,
  getLevelText,
  getLevelClass,
  getLevelIcon
}
