const { Router } = require('express')
const multer = require('multer')
const { authMiddleware } = require('../middleware/auth')
const config = require('../config/index').ocr
const fs = require('fs')

const router = Router()

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只支持图片文件'))
    }
  }
})

router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  handleOCRRequest(req, res)
})

router.post('/parse', authMiddleware, upload.single('report'), async (req, res) => {
  handleOCRRequest(req, res)
})

const handleOCRRequest = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请上传图片文件',
        timestamp: new Date().toISOString()
      })
    }

    const ocrResult = await performOCR(req.file.path)
    
    fs.unlinkSync(req.file.path)

    res.json({
      code: 0,
      message: '识别成功',
      data: ocrResult,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('OCR 识别错误:', error)
    res.status(500).json({
      code: 500,
      message: 'OCR 识别失败',
      timestamp: new Date().toISOString()
    })
  }
}

const performOCR = async (imagePath) => {
  if (config.apiUrl && config.apiKey) {
    return await callExternalOCR(imagePath)
  }
  
  throw new Error('OCR 服务未配置，请联系管理员')
}

const callExternalOCR = async (imagePath) => {
  const axios = require('axios')
  const https = require('https')
  
  try {
    console.log('[OCR] 开始处理文件:', imagePath)
    
    const imageBuffer = fs.readFileSync(imagePath)
    const base64Data = imageBuffer.toString('base64')
    
    const ext = imagePath.toLowerCase().split('.').pop()
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }
    const mimeType = mimeTypes[ext] || 'image/jpeg'
    
    console.log('[OCR] 文件转 base64 成功，长度:', base64Data.length, '类型:', mimeType)
    
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    })
    
    const response = await axios.post(config.apiUrl, {
      model: config.model || 'qwen-vl-plus',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              {
                image: `data:${mimeType};base64,${base64Data}`
              },
              {
                text: `请完整识别并提取这张血常规报告图片中的所有文字内容。

【识别要求】
1. 患者信息：姓名、检测时间、检测医院
2. 必须提取以下 4 项核心指标（包括数值和单位）：
   - 白细胞计数（WBC）
   - 中性粒细胞绝对值（NEUT#/NEUT#）
   - 血红蛋白（HGB/Hb）
   - 血小板计数（PLT）
3. 同时提取其他血常规指标（如 RBC、淋巴细胞等）
4. 保持原有的数值、单位和参考范围
5. 注意识别箭头标记（↑↓）表示的异常提示

请确保所有指标都完整提取，不要遗漏任何一项。`
              }
            ]
          }
        ]
      },
      parameters: {
        temperature: 0.1
      }
    }, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent,
      timeout: 60000
    })
    
    console.log('[OCR] API 响应状态:', response.status)
    
    if (response.data.code && response.data.code !== '200') {
      console.error('[OCR] API 返回错误码:', response.data.code, response.data.message)
      throw new Error(`OCR API 错误：${response.data.message || '未知错误'}`)
    }
    
    const content = response.data.output?.choices?.[0]?.message?.content
    let extractedText = ''
    
    if (Array.isArray(content)) {
      const textContent = content.find((c) => c.text)
      if (textContent) {
        extractedText = textContent.text
      }
    } else if (typeof content === 'string') {
      extractedText = content
    }
    
    console.log('[OCR] 提取的文本前500字符:', extractedText.substring(0, 500))
    console.log('[OCR] 识别成功，文本长度:', extractedText.length)
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('OCR识别结果为空')
    }
    
    return parseOCRText(extractedText)
    
  } catch (error) {
    console.error('[OCR] 调用外部 OCR 失败:', error.message)
    if (error.response) {
      console.error('[OCR] 错误响应:', JSON.stringify(error.response.data, null, 2))
    }
    throw error
  }
}

const parseOCRText = (text) => {
  console.log('[OCR 解析] 输入文本:', text.substring(0, 800))
  
  const result = {
    hospital: '',
    test_time: '',
    patient_name: '',
    wbc_value: '',
    wbc_unit: '×10⁹/L',
    wbc_standard_value: '',
    wbc_standard_unit: '×10⁹/L',
    neut_abs_value: '',
    neut_abs_unit: '×10⁹/L',
    neut_abs_standard_value: '',
    neut_abs_standard_unit: '×10⁹/L',
    neut_percent_value: '',
    neut_percent_unit: '%',
    rbc_value: '',
    rbc_unit: '×10¹²/L',
    hgb_value: '',
    hgb_unit: 'g/L',
    hgb_standard_value: '',
    hgb_standard_unit: 'g/L',
    plt_value: '',
    plt_unit: '×10⁹/L',
    plt_standard_value: '',
    plt_standard_unit: '×10⁹/L'
  }
  
  if (!text || text.trim().length === 0) {
    console.log('[OCR 解析] 文本为空，返回空结果')
    return result
  }
  
  const extractValueAndUnit = (text, patterns, indicatorType = '') => {
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i]
      const match = text.match(pattern)
      console.log(`[OCR 解析] 尝试匹配模式 ${i+1}:`, pattern.toString().substring(0, 120), '结果:', match ? '成功' : '失败')
      if (match) {
        const value = match[1]
        let unit = match[2] || ''
        console.log(`[OCR 解析] 匹配成功：值=${value}, 单位=${unit}`)
        // 只过滤掉单个数字"3"，这可能是血小板计数的误识别
        if (indicatorType === 'PLT' && value === '3' && !unit) {
          console.log('[OCR 解析] 过滤掉单个数字"3"，可能是血小板计数的误识别')
          continue
        }
        return { value, unit: unit.trim() }
      }
    }
    console.log('[OCR 解析] 所有模式都匹配失败')
    return { value: '', unit: '' }
  }
  
  const wbcData = extractValueAndUnit(text, [
    // Markdown列表格式：1. **白细胞计数（WBC）**\n   - **结果**: 3.67
    /白细胞计数\s*[（(]\s*WBC\s*[）)][\s\S]*?\*\*结果\*\*\s*[:：]\s*(\d+\.?\d*)/i,
    /白细胞计数\s*[（(]\s*WBC\s*[）)][\s\S]*?结果\s*[:：]\s*(\d+\.?\d*)/i,
    // Markdown表格格式：| 1 | 白细胞(WBC) | 10.10 | 10^9/L |
    /\|\s*\d+\s*\|\s*白细胞\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    // Markdown表格格式：| 白细胞(WBC) | 10.10 | 10^9/L |
    /\|\s*白细胞\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    // 简单格式：白细胞(WBC) | 10.10 | 10^9/L
    /白细胞\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    // 支持 AI 识别的多行格式（Markdown 格式，支持中英文括号）
    /白细胞计数\s*[（(]\s*WBC\s*[）)][\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    /WBC[\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    /白细胞[\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    // 支持表格格式：| X | 白细胞计数 (WBC) | 6.09 | x10^9/L |
    /\|\s*\d+\s*\|\s*白细胞 [^(]*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /\|\s*\d+\s*\|\s*WBC\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /\|\s*白细胞 [^(]*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL)?/i,
    // 原有的模式
    /\*?\s*白细胞计数\s*\([^(]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /白细胞计数\s*\([^(]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /白细胞\s*\([^(]*\)\s*(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /白细胞\s+(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /白细胞计数\s+(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /WBC\s*(?:[:：]|\s+)?(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /白细胞.*?(\d+\.?\d*)\s*(10\^9\/L|×10⁹\/L)?/i,
    /白细胞.*?[\s:：](\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*(?:10\^9\/L|×10⁹\/L)\s*白细胞/i
  ], 'WBC')
  if (wbcData.value) {
    result.wbc_value = wbcData.value
    result.wbc_unit = wbcData.unit || '×10⁹/L'
    
    try {
      const { convertToStandard } = require('../services/unitConversionService')
      const converted = convertToStandard('WBC', wbcData.value, result.wbc_unit)
      if (converted.success) {
        result.wbc_standard_value = converted.standardizedValue
        result.wbc_standard_unit = converted.standardUnit
        console.log(`[OCR 解析] WBC 换算：${wbcData.value} ${result.wbc_unit} → ${result.wbc_standard_value} ${result.wbc_standard_unit}`)
      } else {
        // 换算失败，直接用原始值作为标准值
        result.wbc_standard_value = wbcData.value
        console.log(`[OCR 解析] WBC 换算失败，使用原始值: ${wbcData.value}`)
      }
    } catch (e) {
      console.error('[OCR 解析] WBC 换算异常:', e)
      result.wbc_standard_value = wbcData.value
    }
  } else {
    console.log('[OCR 解析] 未找到 WBC 数值')
  }
  
  const neutData = extractValueAndUnit(text, [
    // Markdown列表格式：2. **中性粒细胞绝对值（NEUT#）**\n   - **结果**: 2.03
    /中性粒细胞绝对值\s*[（(]\s*NEUT#\s*[）)][\s\S]*?\*\*结果\*\*\s*[:：]\s*(\d+\.?\d*)/i,
    /中性粒细胞绝对值\s*[（(]\s*NEUT#\s*[）)][\s\S]*?结果\s*[:：]\s*(\d+\.?\d*)/i,
    // Markdown表格格式：| 7 | 中性粒细胞# (NE#) | 5.71 | 10^9/L |
    /\|\s*\d+\s*\|\s*中性粒细胞#\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    // Markdown表格格式：| 中性粒细胞# (NE#) | 5.71 | 10^9/L |
    /\|\s*中性粒细胞#\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    // 简单格式：中性粒细胞# (NE#) | 5.71 | 10^9/L
    /中性粒细胞#\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    // 支持 AI 识别的多行格式（Markdown 格式，支持中英文括号）
    /中性粒细胞绝对值\s*[（(]\s*NEUT#\s*[）)][\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    /中性粒细胞[\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    /NEUT#[\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    // 支持表格格式
    /\|\s*\d+\s*\|\s*中性粒细胞 [#\s]*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /\|\s*\d+\s*\|\s*NE#\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /\|\s*中性粒细胞 [#\s]*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL)?/i,
    // 原有的模式
    /\*?\s*中性粒细胞绝对值\s*\([^(]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /中性粒细胞绝对值\s*\([^(]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /中性粒细胞#\s*\([^(]*\)\s*(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /中性粒细胞#\s+(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /中性粒细胞绝对值\s+(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /NEUT#\s*(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /NE#\s*(?:[:：]|\s+)?(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /Neu#\s*(?:[:：]|\s+)?(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL)?/i,
    /中性粒细胞.*?(\d+\.?\d*)\s*(10\^9\/L|×10⁹\/L)?/i,
    /中性粒细胞.*?[\s:：](\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*(?:10\^9\/L|×10⁹\/L)\s*中性粒细胞/i
  ], 'NEUT#')
  if (neutData.value) {
    result.neut_abs_value = neutData.value
    result.neut_abs_unit = neutData.unit || '×10⁹/L'
    
    try {
      const { convertToStandard } = require('../services/unitConversionService')
      const converted = convertToStandard('NEUT#', neutData.value, result.neut_abs_unit)
      if (converted.success) {
        result.neut_abs_standard_value = converted.standardizedValue
        result.neut_abs_standard_unit = converted.standardUnit
        console.log(`[OCR 解析] NEUT# 换算：${neutData.value} ${result.neut_abs_unit} → ${result.neut_abs_standard_value} ${result.neut_abs_standard_unit}`)
      } else {
        result.neut_abs_standard_value = neutData.value
        console.log(`[OCR 解析] NEUT# 换算失败，使用原始值: ${neutData.value}`)
      }
    } catch (e) {
      console.error('[OCR 解析] NEUT# 换算异常:', e)
      result.neut_abs_standard_value = neutData.value
    }
  } else {
    console.log('[OCR 解析] 未找到 NEUT# 数值')
  }
  
  const hgbData = extractValueAndUnit(text, [
    // Markdown表格格式：| X | 血红蛋白(HGB) | 142 | g/L |
    /\|\s*\d+\s*\|\s*血红蛋白\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(g\/L|g\/dL)?/i,
    // Markdown表格格式：| 血红蛋白(HGB) | 142 | g/L |
    /\|\s*血红蛋白\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(g\/L|g\/dL)?/i,
    // 简单格式：血红蛋白(HGB) | 142 | g/L
    /血红蛋白\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(g\/L|g\/dL)?/i,
    // 新增：简单的数值提取
    /(?:HGB|Hb|血红蛋白|血色素)[\s\S]*?(\d+\.?\d*)/i,
    /血红蛋白\s*[（(]\s*HGB\s*[）)][\s\S]*?(\d+\.?\d*)/i,
    /HGB[\s\S]*?(\d+\.?\d*)/i,
    // 原有的模式
    /\*?\s*血红蛋白\s*\([^(]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(g\/L|g\/dL)?/i,
    /血红蛋白\s*\([^(]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(g\/L|g\/dL)?/i,
    /血红蛋白\s*\([^(]*\)\s*(\d+\.?\d*)\s*(g\/L|g\/dL)?/i,
    /血红蛋白\s+(\d+\.?\d*)\s*(g\/L|g\/dL)?/i,
    /血色素\s+(\d+\.?\d*)\s*(g\/L|g\/dL)?/i,
    /HGB\s*(?:[:：]|\s+)?(\d+\.?\d*)\s*(g\/L|g\/dL)?/i,
    /Hb\s*(?:[:：]|\s+)?(\d+\.?\d*)\s*(g\/L|g\/dL)?/i,
    // 支持 AI 识别的多行格式（Markdown 格式，支持中英文括号）
    /血红蛋白\s*[（(]\s*HGB\s*[）)][\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    /血红蛋白[\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    /HGB[\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i
  ])
  if (hgbData.value) {
    result.hgb_value = hgbData.value
    result.hgb_unit = hgbData.unit || 'g/L'
    
    try {
      const { convertToStandard } = require('../services/unitConversionService')
      const converted = convertToStandard('HGB', hgbData.value, result.hgb_unit)
      if (converted.success) {
        result.hgb_standard_value = converted.standardizedValue
        result.hgb_standard_unit = converted.standardUnit
        console.log(`[OCR 解析] HGB 换算：${hgbData.value} ${result.hgb_unit} → ${result.hgb_standard_value} ${result.hgb_standard_unit}`)
      } else {
        result.hgb_standard_value = hgbData.value
        console.log(`[OCR 解析] HGB 换算失败，使用原始值: ${hgbData.value}`)
      }
    } catch (e) {
      console.error('[OCR 解析] HGB 换算异常:', e)
      result.hgb_standard_value = hgbData.value
    }
  } else {
    console.log('[OCR 解析] 未找到 HGB 数值')
  }
  
  const pltData = extractValueAndUnit(text, [
    // Markdown表格格式：| X | 血小板(PLT) | 349 | 10^9/L |
    /\|\s*\d+\s*\|\s*血小板\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    // Markdown表格格式：| 血小板(PLT) | 349 | 10^9/L |
    /\|\s*血小板\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    // 简单格式：血小板(PLT) | 349 | 10^9/L
    /血小板\s*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    // 新增：简单的数值提取
    /(?:PLT|血小板)[\s\S]*?(\d+\.?\d*)/i,
    /血小板计数\s*[（(]\s*PLT\s*[）)][\s\S]*?(\d+\.?\d*)/i,
    /PLT[\s\S]*?(\d+\.?\d*)/i,
    // 原有的模式
    /\*?\s*血小板计数\s*\([^(]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    /血小板计数\s*\([^(]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    /血小板\s*\([^(]*\)\s*(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    /血小板\s+(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    /血小板计数\s+(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    /PLT\s*(?:[:：]|\s+)?(\d+\.?\d*)\s*(10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    /血小板.*?(\d+\.?\d*)\s*(10\^9\/L|×10⁹\/L)?/i,
    /血小板.*?[\s:：](\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*(?:10\^9\/L|×10⁹\/L)\s*血小板/i,
    // 支持 AI 识别的多行格式（Markdown 格式，支持中英文括号）
    /血小板计数\s*[（(]\s*PLT\s*[）)][\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    /血小板[\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    /PLT[\s\S]*?\*?\s*结果\*?\s*[:：]\s*(\d+\.?\d*)/i,
    // 支持表格格式
    /\|\s*\d+\s*\|\s*血小板 [^(]*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    /\|\s*\d+\s*\|\s*PLT\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i,
    /\|\s*血小板 [^(]*\([^)]*\)\s*\|\s*(\d+\.?\d*)\s*\|\s*(10\^9\/L|x10\^9\/L|10\^3\/μL|K\/uL|\/μL)?/i
  ])
  if (pltData.value) {
    result.plt_value = pltData.value
    result.plt_unit = pltData.unit || '×10⁹/L'
    
    try {
      const { convertToStandard } = require('../services/unitConversionService')
      const converted = convertToStandard('PLT', pltData.value, result.plt_unit)
      if (converted.success) {
        result.plt_standard_value = converted.standardizedValue
        result.plt_standard_unit = converted.standardUnit
        console.log(`[OCR 解析] PLT 换算：${pltData.value} ${result.plt_unit} → ${result.plt_standard_value} ${result.plt_standard_unit}`)
      } else {
        result.plt_standard_value = pltData.value
        console.log(`[OCR 解析] PLT 换算失败，使用原始值: ${pltData.value}`)
      }
    } catch (e) {
      console.error('[OCR 解析] PLT 换算异常:', e)
      result.plt_standard_value = pltData.value
    }
  } else {
    console.log('[OCR 解析] 未找到 PLT 数值')
  }
  
  // 优先匹配带标签的检测时间
  const testTimeMatch = text.match(/(?:检测时间|采样时间)\s*[:：]\s*(\d{4}[-年]\s*\d{1,2}[-月]\s*\d{1,2}日?)/i)
  if (testTimeMatch) {
    let dateStr = testTimeMatch[1].replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '').replace(/\s+/g, '')
    result.test_time = dateStr
    console.log(`[OCR 解析] 检测时间：${result.test_time}`)
  } else {
    // 尝试其他日期格式
    const dateMatch = text.match(/(\d{4}[-年]\s*\d{1,2}[-月]\s*\d{1,2}日?)/i)
    if (dateMatch) {
      let dateStr = dateMatch[1].replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '').replace(/\s+/g, '')
      result.test_time = dateStr
      console.log(`[OCR 解析] 日期：${result.test_time}`)
    } else {
      const altDateMatch1 = text.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/)
      if (altDateMatch1) {
        result.test_time = `${altDateMatch1[1]}-${altDateMatch1[2].padStart(2, '0')}-${altDateMatch1[3].padStart(2, '0')}`
        console.log(`[OCR 解析] 日期(备用格式1)：${result.test_time}`)
      }
    }
  }
  
  const nameMatch = text.match(/姓名 [:：]\s*([^\s\n]+)/)
  if (nameMatch) {
    result.patient_name = nameMatch[1]
    console.log(`[OCR 解析] 姓名：${result.patient_name}`)
  }
  
  console.log('[OCR 解析] 最终结果:', {
    wbc_value: result.wbc_value,
    wbc_standard_value: result.wbc_standard_value,
    hgb_value: result.hgb_value,
    hgb_standard_value: result.hgb_standard_value,
    plt_value: result.plt_value,
    plt_standard_value: result.plt_standard_value
  })
  
  return result
}

module.exports = router
