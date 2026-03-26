const { Router } = require('express')

const router = Router()

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
      { level: 'warning', levelName: 'I级', range: '1.0-1.4', principle: '轻度减少，观察即可，注意预防感染', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '0.5-0.9', principle: '中度减少，需对症处理，考虑使用升白药物', dischargeAdvice: '若ANC在0.5-0.9×10⁹/L之间，需密切观察，可考虑使用升白药物（如G-CSF），并注意预防感染', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'III级', range: '0.1-0.4', principle: '重度减少，必须使用升白药物，必要时预防性使用抗生素', dischargeAdvice: '若ANC在0.1-0.4×10⁹/L之间，必须使用升白药物（G-CSF），预防性使用抗生素，并密切监测体温变化', color: 'bg-red-500/10 text-red-600' },
      { level: 'critical', levelName: 'IV级', range: '<0.1', principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', dischargeAdvice: '若ANC<0.1×10⁹/L，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查', color: 'bg-critical/10 text-critical' },
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
      { level: 'normal', levelName: '0级', range: '≥4.0', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '3.0-3.9', principle: '轻度减少，观察即可，注意预防感染', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '2.0-2.9', principle: '中度减少，需对症处理，考虑使用升白药物', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'III级', range: '1.0-1.9', principle: '重度减少，必须使用升白药物，必要时预防性使用抗生素', color: 'bg-red-500/10 text-red-600' },
      { level: 'critical', levelName: 'IV级', range: '<1.0', principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', dischargeAdvice: '若WBC<1.0×10⁹/L，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查', color: 'bg-critical/10 text-critical' },
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
      { level: 'normal', levelName: '0级', range: '男≥120 / 女≥110', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '男100-119 / 女90-109', principle: '轻度贫血，观察即可，注意营养补充', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '80-99', principle: '中度贫血，需对症处理，考虑使用促红细胞生成药物', dischargeAdvice: '若HGB在80-99g/L之间，需对症治疗，可考虑使用促红细胞生成素（EPO），并注意补充铁剂和叶酸', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'III级', range: '60-79', principle: '重度贫血，必须输血或使用促红细胞生成药物', dischargeAdvice: '若HGB在60-79g/L之间，必须输血或使用促红细胞生成素，并密切监测心功能', color: 'bg-red-500/10 text-red-600' },
      { level: 'critical', levelName: 'IV级', range: '<60', principle: '极重度贫血，立即输血治疗，可能需暂停化疗', dischargeAdvice: '若HGB<60g/L，或出现心悸、气短加重，须立即输血治疗，并评估是否需要暂停化疗', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'PLT',
    name: '血小板计数（PLT）',
    shortName: '血小板',
    unit: '×10⁹/L',
    clinicalSignificance: '血小板负责止血功能。减少时易出现自发性出血（如牙龈出血、瘀斑），<20×10⁹/L时为出血危象，可能发生颅内出血.',
    careTips: [
      '自我监测：观察皮肤有无瘀点瘀斑，牙龈有无出血，大便颜色是否变黑',
      '生活护理：避免剧烈运动和碰撞，使用软毛牙刷',
      '进食软食，保持大便通畅，避免用力排便',
      '避免使用阿司匹林等影响凝血功能的药物',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '≥100', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '75-99', principle: '轻度减少，观察即可，注意预防出血', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '50-74', principle: '中度减少，需对症处理，考虑使用升血小板药物', dischargeAdvice: '若PLT在50-74×10⁹/L之间，需对症治疗，可考虑使用升血小板药物（如TPO），并注意预防出血', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'III级', range: '25-49', principle: '重度减少，必须使用升血小板药物，必要时输注血小板', dischargeAdvice: '若PLT在25-49×10⁹/L之间，必须使用升血小板药物（TPO），必要时输注血小板，并密切监测出血情况', color: 'bg-red-500/10 text-red-600' },
      { level: 'critical', levelName: 'IV级', range: '<25', principle: '极重度减少，立即输注血小板，可能需暂停化疗', dischargeAdvice: '若PLT<25×10⁹/L，或出现活动性出血，须立即输注血小板，并评估是否需要暂停化疗', color: 'bg-critical/10 text-critical' },
    ],
  },
]

router.get('/', async (req, res) => {
  try {
    res.json({
      code: 0,
      data: REFERENCE_DATA,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取分级速查数据错误:', error)
    res.status(500).json({
      code: 500,
      message: '获取分级速查数据失败',
      timestamp: new Date().toISOString()
    })
  }
})

module.exports = { router, REFERENCE_DATA }
