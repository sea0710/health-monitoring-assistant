const { convertToStandard, validateValue, getConversionInfo } = require('../unitConversionService')

console.log('=== 单位换算服务测试 ===\n')

console.log('1. WBC 单位换算测试')
console.log('-------------------')
const wbcTests = [
  { value: 10.1, unit: '×10⁹/L' },
  { value: 10.1, unit: '×10³/μL' },
  { value: 6.5, unit: 'K/uL' },
  { value: 3.2, unit: '10^9/L' }
]

wbcTests.forEach(test => {
  const result = convertToStandard('WBC', test.value, test.unit)
  console.log(`${test.value} ${test.unit} → ${result.standardizedValue} ${result.standardUnit} ${result.note ? `(${result.note})` : ''}`)
})

console.log('\n2. HGB 单位换算测试')
console.log('-------------------')
const hgbTests = [
  { value: 120, unit: 'g/L' },
  { value: 12, unit: 'g/dL' },
  { value: 13.5, unit: 'g/dL' },
  { value: 145, unit: 'g/L' }
]

hgbTests.forEach(test => {
  const result = convertToStandard('HGB', test.value, test.unit)
  console.log(`${test.value} ${test.unit} → ${result.standardizedValue} ${result.standardUnit} ${result.note ? `(${result.note})` : ''}`)
})

console.log('\n3. PLT 单位换算测试')
console.log('-------------------')
const pltTests = [
  { value: 250, unit: '×10⁹/L' },
  { value: 250, unit: '×10³/μL' },
  { value: 250000, unit: '/μL' },
  { value: 180, unit: 'K/uL' }
]

pltTests.forEach(test => {
  const result = convertToStandard('PLT', test.value, test.unit)
  console.log(`${test.value} ${test.unit} → ${result.standardizedValue} ${result.standardUnit} ${result.note ? `(${result.note})` : ''}`)
})

console.log('\n4. NEUT# 单位换算测试')
console.log('---------------------')
const neutTests = [
  { value: 3.5, unit: '×10⁹/L' },
  { value: 3.5, unit: '×10³/μL' },
  { value: 2.8, unit: 'K/uL' }
]

neutTests.forEach(test => {
  const result = convertToStandard('NEUT#', test.value, test.unit)
  console.log(`${test.value} ${test.unit} → ${result.standardizedValue} ${result.standardUnit} ${result.note ? `(${result.note})` : ''}`)
})

console.log('\n5. 数值验证测试')
console.log('---------------')
const validationTests = [
  { indicator: 'WBC', value: 10.1, unit: '×10⁹/L' },
  { indicator: 'WBC', value: 150, unit: '×10⁹/L' },
  { indicator: 'HGB', value: 12, unit: 'g/dL' },
  { indicator: 'HGB', value: 1200, unit: 'g/L' },
  { indicator: 'PLT', value: 250000, unit: '/μL' }
]

validationTests.forEach(test => {
  const validation = validateValue(test.indicator, test.value, test.unit)
  console.log(`${test.indicator}: ${test.value} ${test.unit} - ${validation.isValid ? '✓ 有效' : '✗ 无效'} ${validation.warning ? '(警告)' : ''}`)
  if (!validation.isValid || validation.warning) {
    console.log(`  提示：${validation.suggestion}`)
  }
})

console.log('\n6. 换算信息查询')
console.log('---------------')
const indicators = ['WBC', 'HGB', 'PLT', 'NEUT#']
indicators.forEach(indicator => {
  const info = getConversionInfo(indicator)
  console.log(`\n${indicator}:`)
  console.log(`  标准单位：${info.standardUnit}`)
  console.log(`  支持单位：${info.supportedUnits.map(u => u.unit).join(', ')}`)
  if (info.validationRange) {
    console.log(`  验证范围：${info.validationRange.min} - ${info.validationRange.max}`)
  }
})

console.log('\n=== 测试完成 ===\n')
