const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const OCR_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
const OCR_API_KEY = 'sk-501911f371d34d4f8da2959bd70b01f5'
const OCR_MODEL = 'qwen-vl-plus'

exports.main = async (event, context) => {
  const { fileID } = event
  
  try {
    if (!fileID) {
      return { code: 400, message: '请提供图片文件ID' }
    }
    
    const downloadResult = await cloud.downloadFile({ fileID })
    const imageBuffer = downloadResult.fileContent
    const base64Image = imageBuffer.toString('base64')
    
    const response = await axios({
      method: 'POST',
      url: OCR_API_URL,
      headers: {
        'Authorization': `Bearer ${OCR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: OCR_MODEL,
        input: {
          messages: [{
            role: 'user',
            content: [
              { image: `data:image/jpeg;base64,${base64Image}` },
              { text: `请识别这张血常规检验报告图片中的所有文字内容，并按以下JSON格式输出：
{
  "test_time": "检测时间，格式如2024-01-01",
  "test_hospital": "检测医院名称",
  "indicators": [
    {"name": "白细胞计数", "code": "WBC", "value": 数值, "unit": "单位"},
    {"name": "中性粒细胞绝对值", "code": "NEUT#", "value": 数值, "unit": "单位"},
    {"name": "中性粒细胞百分比", "code": "NEUT%", "value": 数值, "unit": "单位"},
    {"name": "淋巴细胞绝对值", "code": "LYMPH#", "value": 数值, "unit": "单位"},
    {"name": "淋巴细胞百分比", "code": "LYMPH%", "value": 数值, "unit": "单位"},
    {"name": "单核细胞绝对值", "code": "MONO#", "value": 数值, "unit": "单位"},
    {"name": "单核细胞百分比", "code": "MONO%", "value": 数值, "unit": "单位"},
    {"name": "嗜酸性粒细胞绝对值", "code": "EOS#", "value": 数值, "unit": "单位"},
    {"name": "嗜酸性粒细胞百分比", "code": "EOS%", "value": 数值, "unit": "单位"},
    {"name": "嗜碱性粒细胞绝对值", "code": "BASO#", "value": 数值, "unit": "单位"},
    {"name": "嗜碱性粒细胞百分比", "code": "BASO%", "value": 数值, "unit": "单位"},
    {"name": "红细胞计数", "code": "RBC", "value": 数值, "unit": "单位"},
    {"name": "血红蛋白", "code": "HGB", "value": 数值, "unit": "单位"},
    {"name": "红细胞压积", "code": "HCT", "value": 数值, "unit": "单位"},
    {"name": "平均红细胞体积", "code": "MCV", "value": 数值, "unit": "单位"},
    {"name": "平均红细胞血红蛋白量", "code": "MCH", "value": 数值, "unit": "单位"},
    {"name": "平均红细胞血红蛋白浓度", "code": "MCHC", "value": 数值, "unit": "单位"},
    {"name": "红细胞分布宽度SD", "code": "RDW-SD", "value": 数值, "unit": "单位"},
    {"name": "红细胞分布宽度CV", "code": "RDW-CV", "value": 数值, "unit": "单位"},
    {"name": "血小板计数", "code": "PLT", "value": 数值, "unit": "单位"},
    {"name": "血小板分布宽度", "code": "PDW", "value": 数值, "unit": "单位"},
    {"name": "平均血小板体积", "code": "MPV", "value": 数值, "unit": "单位"},
    {"name": "大血小板比率", "code": "P-LCR", "value": 数值, "unit": "单位"},
    {"name": "血小板压积", "code": "TCT", "value": 数值, "unit": "单位"},
    {"name": "C-反应蛋白", "code": "CRP", "value": 数值, "unit": "单位"}
  ]
}
如果某项指标未检测或无法识别，请将value设为null。请直接输出JSON，不要有其他文字。` }
            ]
          }]
        }
      },
      timeout: 50000
    })
    
    const result = response.data
    let textContent = ''
    
    if (result.output && result.output.choices && result.output.choices[0]) {
      const choice = result.output.choices[0]
      if (choice.message && choice.message.content) {
        if (Array.isArray(choice.message.content)) {
          textContent = choice.message.content.map(c => c.text || '').join('')
        } else if (typeof choice.message.content === 'string') {
          textContent = choice.message.content
        }
      }
    }
    
    if (!textContent) {
      return {
        code: 500,
        message: 'OCR识别结果为空',
        debug: { rawResult: JSON.stringify(result).substring(0, 2000) }
      }
    }
    
    console.log('OCR识别的原始文本:', textContent)
    
    // 尝试解析JSON格式的响应
    let extractedData = null
    try {
      // 提取JSON字符串（可能在```代码块中）
      const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/) || textContent.match(/(\{[\s\S]*\})/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1]
        console.log('尝试解析JSON:', jsonStr)
        const jsonData = JSON.parse(jsonStr)
        
        // 验证医院名称，如果无效则返回空
        let hospital = jsonData.test_hospital || ''
        const invalidPatterns = [/根据您提供/, /以下是/, /请识别/, /图片/, /报告/, /检验/]
        const isInvalidHospital = invalidPatterns.some(p => p.test(hospital)) || hospital.length < 4
        if (isInvalidHospital) {
          hospital = ''
        }
        
        // 转换为标准格式
        extractedData = {
          test_time: jsonData.test_time || '',
          test_hospital: hospital,
          indicators: []
        }
        
        // 转换indicators
        if (jsonData.indicators && Array.isArray(jsonData.indicators)) {
          for (const ind of jsonData.indicators) {
            if (ind.value !== null && ind.value !== undefined) {
              extractedData.indicators.push({
                indicator_code: ind.code,
                indicator_name: ind.name,
                test_value: parseFloat(ind.value),
                unit: ind.unit || ''
              })
            }
          }
        }
        
        console.log('JSON解析成功，指标数量:', extractedData.indicators.length)
      }
    } catch (e) {
      console.log('JSON解析失败，使用正则表达式解析:', e.message)
    }
    
    // 如果JSON解析失败或没有数据，使用正则表达式解析
    if (!extractedData || extractedData.indicators.length === 0) {
      extractedData = extractBloodTestData(textContent)
    }
    
    // 添加调试信息
    console.log('Extracted indicators:', extractedData.indicators)
    console.log('Indicators count:', extractedData.indicators.length)
    
    return {
      code: 0,
      message: '识别成功',
      data: extractedData,
      rawText: textContent,
      debug: {
        indicators: extractedData.indicators
      }
    }
  } catch (error) {
    console.error('OCR识别失败:', error)
    return {
      code: 500,
      message: 'OCR识别失败: ' + (error.message || '未知错误'),
      error: error.response ? JSON.stringify(error.response.data) : error.message
    }
  }
}

function extractBloodTestData(text) {
  const result = {
    test_time: '',
    test_hospital: '',
    indicators: []
  }
  
  // 提取检测时间 - 支持多种格式
  const datePatterns = [
    /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/,
    /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
    /(\d{2})[-/](\d{1,2})[-/](\d{1,2})/
  ]
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      if (pattern === datePatterns[2]) {
        // 处理2位年份
        const year = '20' + match[1]
        result.test_time = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      } else {
        result.test_time = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      }
      break
    }
  }
  
  // 提取检测医院
  const excludePatterns = [
    /根据您提供/,
    /以下是/,
    /血常规/,
    /检验报告/,
    /图片内容/,
    /识别结果/,
    /请识别/,
    /这是一张/,
    /检测报告/,
    /化验单/,
    /报告单/
  ]
  
  const hospitalMatch = text.match(/([^\s,，。！？、\n]+医院)/)
  if (hospitalMatch) {
    const hospitalName = hospitalMatch[1]
    let isDescription = false
    for (const pattern of excludePatterns) {
      if (pattern.test(hospitalName)) {
        isDescription = true
        break
      }
    }
    if (!isDescription && hospitalName.length >= 4 && hospitalName.length <= 30) {
      result.test_hospital = hospitalName
    }
  }
  
  // 指标配置 - 包含别称（注意：绝对值指标要放在百分比前面，优先匹配）
  const indicators = [
    { 
      code: 'WBC', 
      name: '白细胞计数', 
      aliases: ['白细胞', '白血球', '白细胞总数', 'WBC'],
      unit: '×10^9/L', 
      min: 3.5, 
      max: 9.5 
    },
    { 
      code: 'NEUT#', 
      name: '中性粒细胞绝对值', 
      aliases: ['中性粒细胞#', '中性粒细胞＃', '中性粒細胞#', '中性粒細胞＃', '中性粒细胞绝对值', '中性粒细胞计数', '中性粒细胞绝对数', '中性粒细胞数目', '中性粒细胞数', 'NEUT#', 'NE#', 'ANC', 'GRAN#', '中性粒#', '中性粒細胞#', '中性粒细胞（绝对值）', '中性粒细胞绝对值（NE#）'],
      unit: '×10^9/L', 
      min: 1.8, 
      max: 6.3 
    },
    { 
      code: 'NEUT%', 
      name: '中性粒细胞百分比', 
      aliases: ['中性粒细胞%', '中性粒细胞％', '中性粒細胞%', '中性粒細胞％', '中性粒细胞百分比', '中性粒细胞比率', '中粒%', '中性粒比例', '中性粒细胞百分率', 'NEUT%', 'NE%', 'GRAN%'],
      unit: '%', 
      min: 40, 
      max: 75 
    },
    { 
      code: 'LYMPH#', 
      name: '淋巴细胞绝对值', 
      aliases: ['淋巴细胞#', '淋巴细胞＃', '淋巴細胞#', '淋巴細胞＃', '淋巴细胞绝对值', '淋巴细胞计数', '淋巴细胞绝对数', '淋巴细胞数目', '淋巴细胞数', 'LYMPH#', 'LY#', '淋巴细胞（绝对值）'],
      unit: '×10^9/L', 
      min: 1.1, 
      max: 3.2 
    },
    { 
      code: 'LYMPH%', 
      name: '淋巴细胞百分比', 
      aliases: ['淋巴细胞%', '淋巴细胞％', '淋巴細胞%', '淋巴細胞％', '淋巴细胞百分比', '淋巴细胞比率', '淋巴%', '淋巴细胞比例', '淋巴细胞百分率', 'LYMPH%', 'LY%'],
      unit: '%', 
      min: 20, 
      max: 50 
    },
    { 
      code: 'MONO#', 
      name: '单核细胞绝对值', 
      aliases: ['单核细胞#', '单核细胞＃', '單核細胞#', '單核細胞＃', '单核细胞绝对值', '单核细胞计数', '单核细胞绝对数', '单核细胞数目', '单核细胞数', 'MONO#', 'MO#', '单核细胞（绝对值）'],
      unit: '×10^9/L', 
      min: 0.1, 
      max: 0.6 
    },
    { 
      code: 'MONO%', 
      name: '单核细胞百分比', 
      aliases: ['单核细胞%', '单核细胞％', '單核細胞%', '單核細胞％', '单核细胞百分比', '单核细胞比率', '单核%', '单核细胞比例', '单核细胞百分率', 'MONO%', 'MO%'],
      unit: '%', 
      min: 3, 
      max: 10 
    },
    { 
      code: 'EOS#', 
      name: '嗜酸性粒细胞绝对值', 
      aliases: ['嗜酸性粒细胞#', '嗜酸性粒细胞＃', '嗜酸性粒細胞#', '嗜酸性粒細胞＃', '嗜酸性粒细胞绝对值', '嗜酸性粒细胞计数', '嗜酸性粒细胞绝对数', '嗜酸性粒细胞数目', '嗜酸性粒细胞数', 'EOS#', 'EO#', '嗜酸细胞#', '嗜酸#'],
      unit: '×10^9/L', 
      min: 0.02, 
      max: 0.52 
    },
    { 
      code: 'EOS%', 
      name: '嗜酸性粒细胞百分比', 
      aliases: ['嗜酸性粒细胞%', '嗜酸性粒细胞％', '嗜酸性粒細胞%', '嗜酸性粒細胞％', '嗜酸性粒细胞百分比', '嗜酸性粒细胞比率', '嗜酸%', '嗜酸性粒细胞比例', '嗜酸性粒细胞百分率', 'EOS%', 'EO%', '嗜酸细胞%'],
      unit: '%', 
      min: 0.4, 
      max: 8 
    },
    { 
      code: 'BASO#', 
      name: '嗜碱性粒细胞绝对值', 
      aliases: ['嗜碱性粒细胞#', '嗜碱性粒细胞＃', '嗜碱性粒細胞#', '嗜碱性粒細胞＃', '嗜碱性粒细胞绝对值', '嗜碱性粒细胞计数', '嗜碱性粒细胞绝对数', '嗜碱性粒细胞数目', '嗜碱性粒细胞数', 'BASO#', 'BA#', '嗜碱细胞#', '嗜碱#'],
      unit: '×10^9/L', 
      min: 0, 
      max: 0.06 
    },
    { 
      code: 'BASO%', 
      name: '嗜碱性粒细胞百分比', 
      aliases: ['嗜碱性粒细胞%', '嗜碱性粒细胞％', '嗜碱性粒細胞%', '嗜碱性粒細胞％', '嗜碱性粒细胞百分比', '嗜碱性粒细胞比率', '嗜碱%', '嗜碱性粒细胞比例', '嗜碱性粒细胞百分率', 'BASO%', 'BA%', '嗜碱细胞%'],
      unit: '%', 
      min: 0, 
      max: 1 
    },
    { 
      code: 'RBC', 
      name: '红细胞计数', 
      aliases: ['红细胞计数', '红细胞', '红血球', 'RBC', '紅細胞'],
      unit: '×10^12/L', 
      min: 4.3, 
      max: 5.8 
    },
    { 
      code: 'HGB', 
      name: '血红蛋白', 
      aliases: ['血红蛋白', '血色素', 'Hb', '血色素值', 'HGB', 'HGBb', '血紅蛋白'],
      unit: 'g/L', 
      min: 130, 
      max: 175 
    },
    { 
      code: 'HCT', 
      name: '红细胞压积', 
      aliases: ['红细胞压积', '红细胞比容', 'HCT', '血细胞比容', '紅細胞壓積'],
      unit: '%', 
      min: 40, 
      max: 50 
    },
    { 
      code: 'MCV', 
      name: '平均红细胞体积', 
      aliases: ['平均红细胞体积', '红细胞平均体积', 'MCV', '平均紅細胞體積'],
      unit: 'fL', 
      min: 82, 
      max: 100 
    },
    { 
      code: 'MCH', 
      name: '平均红细胞血红蛋白量', 
      aliases: ['平均红细胞血红蛋白量', '红细胞平均血红蛋白量', 'MCH', '平均红细胞血红蛋白', '平均紅細胞血紅蛋白量'],
      unit: 'pg', 
      min: 27, 
      max: 34 
    },
    { 
      code: 'MCHC', 
      name: '平均红细胞血红蛋白浓度', 
      aliases: ['平均红细胞血红蛋白浓度', '红细胞平均血红蛋白浓度', 'MCHC', '平均红细胞血红蛋白浓度值', '平均紅細胞血紅蛋白濃度'],
      unit: 'g/L', 
      min: 316, 
      max: 354 
    },
    { 
      code: 'RDW-SD', 
      name: '红细胞分布宽度SD', 
      aliases: ['红细胞分布宽度SD', '红细胞分布宽度-SD', 'RDW-SD', 'RDW_SD', 'RDW SD', '紅細胞分佈寬度SD'],
      unit: 'fL', 
      min: 37, 
      max: 51 
    },
    { 
      code: 'RDW-CV', 
      name: '红细胞分布宽度CV', 
      aliases: ['红细胞分布宽度CV', '红细胞分布宽度-CV', 'RDW-CV', 'RDW_CV', 'RDW CV', 'RDW', '紅細胞分佈寬度CV'],
      unit: '%', 
      min: 11.9, 
      max: 14.5 
    },
    { 
      code: 'PLT', 
      name: '血小板计数', 
      aliases: ['血小板计数', '血小板', 'PLT计数', 'PLT', '血小板数'],
      unit: '×10^9/L', 
      min: 125, 
      max: 350 
    },
    { 
      code: 'PDW', 
      name: '血小板分布宽度', 
      aliases: ['血小板分布宽度', 'PDW', '血小板分布寬度'],
      unit: '%', 
      min: 15, 
      max: 17 
    },
    { 
      code: 'MPV', 
      name: '平均血小板体积', 
      aliases: ['平均血小板体积', 'MPV', '血小板平均体积', '平均血小板體積'],
      unit: 'fL', 
      min: 9, 
      max: 17 
    },
    { 
      code: 'P-LCR', 
      name: '大血小板比率', 
      aliases: ['大血小板比率', 'P-LCR', '大血小板比例', '大型血小板比率', '大血小板比'],
      unit: '%', 
      min: 13, 
      max: 43 
    },
    { 
      code: 'TCT', 
      name: '血小板压积', 
      aliases: ['血小板压积', 'TCT', '血小板比容', '血小板壓積', 'PCT'],
      unit: '%', 
      min: 0.1, 
      max: 0.3 
    },
    { 
      code: 'CRP', 
      name: 'C-反应蛋白', 
      aliases: ['C-反应蛋白', 'C反应蛋白', 'CRP', 'C-反應蛋白', '超敏C反应蛋白', 'hs-CRP'],
      unit: 'mg/L', 
      min: 0, 
      max: 10 
    }
  ]
  
  // 记录已匹配的指标代码，避免重复匹配
  const matchedCodes = new Set()
  
  // 直接在整个OCR文本中搜索每个指标
  for (const ind of indicators) {
    // 如果该指标代码已匹配，跳过
    if (matchedCodes.has(ind.code)) continue
    
    // 构建包含所有别称的正则表达式
    const aliasPattern = ind.aliases.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    console.log('Indicator:', ind.code, 'Aliases:', ind.aliases)
    console.log('Alias pattern:', aliasPattern)
    
    // 直接在整个文本中搜索指标
    // 使用[\s\S]*?匹配任意字符（包括换行），?表示非贪婪匹配
    const regex = new RegExp(`(${aliasPattern})[\\s\\S]*?(\\d+\\.?\\d*)`, 'i')
    const match = text.match(regex)
    
    if (match) {
      console.log('Match found for', ind.code, ':', match[0], 'value:', match[2])
      const value = parseFloat(match[2])
      if (!isNaN(value) && value >= 0) {
        result.indicators.push({
          indicator_code: ind.code,
          indicator_name: ind.name,
          test_value: value,
          reference_min: ind.min,
          reference_max: ind.max,
          unit: ind.unit
        })
        // 标记已匹配
        matchedCodes.add(ind.code)
        console.log('Matched indicator:', ind.code, 'with value:', value)
      }
    }
  }
  
  // 专门处理NEUT#，确保它能够被识别
  if (!matchedCodes.has('NEUT#')) {
    console.log('Trying special handling for NEUT#...')
    const neutPatterns = [
      /中性粒细胞#.*?(\d+\.?\d*)/i,
      /中性粒细胞＃.*?(\d+\.?\d*)/i,
      /中性粒細胞#.*?(\d+\.?\d*)/i,
      /中性粒細胞＃.*?(\d+\.?\d*)/i,
      /NE#.*?(\d+\.?\d*)/i,
      /NEUT#.*?(\d+\.?\d*)/i
    ]
    
    for (const pattern of neutPatterns) {
      const match = text.match(pattern)
      if (match) {
        const value = parseFloat(match[1])
        if (!isNaN(value) && value >= 0) {
          result.indicators.push({
            indicator_code: 'NEUT#',
            indicator_name: '中性粒细胞绝对值',
            test_value: value,
            reference_min: 1.8,
            reference_max: 6.3,
            unit: '×10^9/L'
          })
          matchedCodes.add('NEUT#')
          console.log('Special matched NEUT# with value:', value)
          break
        }
      }
    }
  }
  
  return result
}
