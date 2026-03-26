const UNIT_MAPPINGS = {
  'WBC': {
    '×10⁹/L': { factor: 1, standard: true, aliases: ['×10^9/L', '10^9/L', '10^9/L', 'K/uL', 'K/μL', '×10³/μL', '10^3/μL'] },
    '×10³/μL': { factor: 1, standard: false, aliases: ['K/uL', 'K/μL', '10^3/μL'] }
  },
  'NEUT#': {
    '×10⁹/L': { factor: 1, standard: true, aliases: ['×10^9/L', '10^9/L', 'K/uL', 'K/μL', '×10³/μL', '10^3/μL'] },
    '×10³/μL': { factor: 1, standard: false, aliases: ['K/uL', 'K/μL', '10^3/μL'] }
  },
  'HGB': {
    'g/L': { factor: 1, standard: true, aliases: ['g/l', 'G/L'] },
    'g/dL': { factor: 10, standard: false, aliases: ['g/dl', 'G/dL', 'G/dl'] }
  },
  'PLT': {
    '×10⁹/L': { factor: 1, standard: true, aliases: ['×10^9/L', '10^9/L', 'K/uL', 'K/μL', '×10³/μL', '10^3/μL'] },
    '×10³/μL': { factor: 1, standard: false, aliases: ['K/uL', 'K/μL', '10^3/μL'] },
    '/μL': { factor: 0.001, standard: false, aliases: ['/uL', 'cells/μL', 'cells/uL'] }
  }
}

const STANDARD_UNITS = {
  'WBC': '×10⁹/L',
  'NEUT#': '×10⁹/L',
  'HGB': 'g/L',
  'PLT': '×10⁹/L'
}

const VALIDATION_RANGES = {
  'WBC': { min: 0.1, max: 100, criticalLow: 1.0, criticalHigh: 50.0 },
  'NEUT#': { min: 0.05, max: 50, criticalLow: 0.5, criticalHigh: 20.0 },
  'HGB': { min: 10, max: 300, criticalLow: 60, criticalHigh: 200 },
  'PLT': { min: 5, max: 2000, criticalLow: 20, criticalHigh: 1000 }
}

const identifyUnit = (indicatorCode, unit) => {
  if (!unit || !indicatorCode) return null
  
  const normalizedUnit = String(unit).trim()
  const mappings = UNIT_MAPPINGS[indicatorCode]
  
  if (!mappings) return null
  
  for (const [standardUnit, config] of Object.entries(mappings)) {
    if (normalizedUnit === standardUnit || config.aliases.includes(normalizedUnit)) {
      return {
        originalUnit: normalizedUnit,
        standardUnit: standardUnit,
        factor: config.factor,
        isStandard: config.standard
      }
    }
  }
  
  return null
}

const convertToStandard = (indicatorCode, value, unit) => {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) {
    return {
      success: false,
      error: '无效的数值',
      originalValue: value,
      originalUnit: unit
    }
  }
  
  const unitInfo = identifyUnit(indicatorCode, unit)
  if (!unitInfo) {
    return {
      success: false,
      error: `无法识别单位：${unit}`,
      originalValue: numValue,
      originalUnit: unit
    }
  }
  
  const standardizedValue = numValue * unitInfo.factor
  const standardUnit = STANDARD_UNITS[indicatorCode]
  
  return {
    success: true,
    originalValue: numValue,
    originalUnit: unitInfo.originalUnit,
    standardizedValue: Number(standardizedValue.toFixed(2)),
    standardUnit: standardUnit,
    conversionFactor: unitInfo.factor,
    note: unitInfo.isStandard ? '' : '已换算为标准单位'
  }
}

const validateValue = (indicatorCode, value, unit) => {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) {
    return {
      isValid: false,
      reason: '数值无效',
      suggestion: '请检查数值是否正确'
    }
  }
  
  const ranges = VALIDATION_RANGES[indicatorCode]
  if (!ranges) {
    return {
      isValid: true,
      reason: '无验证规则'
    }
  }
  
  if (numValue < ranges.min || numValue > ranges.max) {
    return {
      isValid: false,
      reason: '数值超出合理范围',
      suggestion: `正常范围：${ranges.min}-${ranges.max}，请确认单位是否正确`
    }
  }
  
  if (numValue < ranges.criticalLow || numValue > ranges.criticalHigh) {
    return {
      isValid: true,
      warning: true,
      reason: '数值异常，请确认',
      suggestion: '该数值明显异常，建议人工核对'
    }
  }
  
  return {
    isValid: true,
    reason: '数值在合理范围内'
  }
}

const convertFromStandard = (indicatorCode, standardizedValue, targetUnit) => {
  const numValue = parseFloat(standardizedValue)
  if (isNaN(numValue)) {
    return {
      success: false,
      error: '无效的数值'
    }
  }
  
  const unitInfo = identifyUnit(indicatorCode, targetUnit)
  if (!unitInfo) {
    return {
      success: false,
      error: `无法识别单位：${targetUnit}`
    }
  }
  
  const convertedValue = numValue / unitInfo.factor
  
  return {
    success: true,
    value: Number(convertedValue.toFixed(2)),
    unit: targetUnit
  }
}

const getAllSupportedUnits = (indicatorCode) => {
  const mappings = UNIT_MAPPINGS[indicatorCode]
  if (!mappings) return []
  
  return Object.entries(mappings).map(([unit, config]) => ({
    unit,
    isStandard: config.standard,
    aliases: config.aliases
  }))
}

const getConversionInfo = (indicatorCode) => {
  return {
    standardUnit: STANDARD_UNITS[indicatorCode],
    supportedUnits: getAllSupportedUnits(indicatorCode),
    validationRange: VALIDATION_RANGES[indicatorCode]
  }
}

module.exports = {
  convertToStandard,
  identifyUnit,
  validateValue,
  convertFromStandard,
  getAllSupportedUnits,
  getConversionInfo,
  UNIT_MAPPINGS,
  STANDARD_UNITS,
  VALIDATION_RANGES
}
