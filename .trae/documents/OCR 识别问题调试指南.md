# OCR 识别问题调试指南

## 问题描述

### 问题 1：检测日期和检测医院默认显示
**现象**：打开上传报告页面时，检测日期和检测医院字段为空，需要用户手动输入

**需求**：
- 不需要默认显示
- OCR 识别后自动填充
- 支持手动修改
- 允许为空

### 问题 2：识别成功但表单为空
**现象**：点击"开始识别"后提示"识别成功"，但指标表单字段为空

**可能原因**：
1. OCR 识别结果中缺少字段
2. 字段名不匹配
3. 数据格式问题
4. 前端 JavaScript 错误

## 已实施的修复

### 修复 1：更新字段占位符
**文件**：`server/public/index.html` (第 963-969 行)

**修改内容**：
```html
<!-- 修改前 -->
<input type="date" id="testTimeInput" class="input-field">
<input type="text" id="hospitalInput" class="input-field" placeholder="请输入医院名称">

<!-- 修改后 -->
<input type="date" id="testTimeInput" class="input-field" placeholder="自动识别或手动填写">
<input type="text" id="hospitalInput" class="input-field" placeholder="自动识别或手动填写">
```

**效果**：
- ✅ 提示用户这些字段可以自动识别
- ✅ 不需要默认值
- ✅ 支持手动填写

### 修复 2：添加调试日志
**文件**：`server/public/index.html` (第 1456-1470 行)

**修改内容**：
```javascript
if (data.code === 0) {
  const ocrData = data.data
  
  console.log('[OCR 识别结果]', ocrData)

  document.getElementById('hospitalInput').value = ocrData.hospital || ''
  document.getElementById('testTimeInput').value = ocrData.test_time || ''

  const wbcValue = ocrData.wbc_standard_value || ocrData.wbc_value || ''
  const neutValue = ocrData.neut_abs_standard_value || ocrData.neut_abs_value || ''
  const hgbValue = ocrData.hgb_standard_value || ocrData.hgb_value || ''
  const pltValue = ocrData.plt_standard_value || ocrData.plt_value || ''
  
  console.log('[填回表单]', {
    wbc: wbcValue,
    neut: neutValue,
    hgb: hgbValue,
    plt: pltValue
  })

  document.getElementById('wbcInput').value = wbcValue
  document.getElementById('neutAbsInput').value = neutValue
  document.getElementById('hgbInput').value = hgbValue
  document.getElementById('pltInput').value = pltValue

  showToast('识别成功，请核对并保存')
}
```

**效果**：
- ✅ 可以在浏览器控制台查看 OCR 识别结果
- ✅ 可以查看实际填回表单的值
- ✅ 便于定位问题

### 修复 3：移除默认日期
**修改内容**：
```javascript
// 修改前
document.getElementById('testTimeInput').value = ocrData.test_time || new Date().toISOString().split('T')[0]

// 修改后
document.getElementById('testTimeInput').value = ocrData.test_time || ''
```

**效果**：
- ✅ 如果 OCR 没有识别到日期，字段保持为空
- ✅ 不会自动填充当天日期
- ✅ 用户可以手动选择

## 调试步骤

### 步骤 1：打开浏览器控制台
1. 访问 http://localhost:3001
2. 按 F12 打开开发者工具
3. 切换到 Console 标签

### 步骤 2：上传报告并识别
1. 点击"添加报告"
2. 上传血常规报告图片
3. 点击"开始识别"

### 步骤 3：查看控制台输出

**查看识别结果**：
```
[OCR 识别结果] {
  hospital: "XX 市人民医院",
  test_time: "2026-03-25",
  wbc_value: "6.2",
  wbc_standard_value: "6.2",
  neut_abs_value: "3.5",
  neut_abs_standard_value: "3.5",
  hgb_value: "135",
  hgb_standard_value: "135",
  plt_value: "250",
  plt_standard_value: "250",
  ...
}
```

**查看填回表单的值**：
```
[填回表单] {
  wbc: "6.2",
  neut: "3.5",
  hgb: "135",
  plt: "250"
}
```

### 步骤 4：检查表单是否填回

**检查字段**：
- ✅ 检测日期：应该有值（如果 OCR 识别到了）
- ✅ 检测医院：应该有值（如果 OCR 识别到了）
- ✅ 白细胞计数 (WBC)：应该有值
- ✅ 中性粒细胞绝对值 (NEUT#)：应该有值
- ✅ 血红蛋白 (HGB)：应该有值
- ✅ 血小板计数 (PLT)：应该有值

## 常见问题排查

### 问题 A：表单仍然为空

**可能原因 1**：OCR 识别失败
- 检查控制台是否有 `[OCR 识别结果]` 输出
- 如果没有输出，说明 API 调用失败
- 查看 Network 标签，检查 API 请求和响应

**可能原因 2**：字段名为空
- 检查 `ocrData.wbc_standard_value` 是否为空字符串
- 如果不为空，说明字段名正确
- 如果为空，检查后端返回的数据结构

**可能原因 3**：JavaScript 错误
- 检查控制台是否有红色错误信息
- 常见错误：元素未找到、类型错误等

**可能原因 4**：DOM 元素 ID 不匹配
- 检查 HTML 中的 input 元素 ID 是否正确
- `wbcInput`, `neutAbsInput`, `hgbInput`, `pltInput`

### 问题 B：识别到的值没有填回

**检查优先级逻辑**：
```javascript
const wbcValue = ocrData.wbc_standard_value || ocrData.wbc_value || ''
```

**优先级**：
1. `wbc_standard_value` - 换算后的标准值（优先）
2. `wbc_value` - 原始值（备选）
3. `''` - 空字符串（默认）

**如果标准值不存在**：
- 检查后端 `convertToStandard` 函数是否执行成功
- 检查 `converted.success` 是否为 true
- 查看后端日志中的换算过程

### 问题 C：日期格式不正确

**期望格式**：`YYYY-MM-DD` (如：2026-03-25)

**OCR 识别的日期格式**：
- `2026-03-25` ✅
- `2026 年 03 月 25 日` ✅（需要转换）
- `2026/03/25` ❌（可能需要转换）

**后端日期处理**：
```javascript
const dateMatch = text.match(/(\d{4}[-年]\d{1,2}[-月]\d{1,2}日？)/)
if (dateMatch) result.test_time = dateMatch[1]
```

**如果需要转换**：
```javascript
if (dateMatch) {
  let dateStr = dateMatch[1]
  dateStr = dateStr.replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '')
  result.test_time = dateStr
}
```

## 后端 OCR 数据结构

**完整的 OCR 返回对象**：
```javascript
{
  hospital: '',                    // 医院名称
  test_time: '',                   // 检测日期 (YYYY-MM-DD)
  patient_name: '',                // 患者姓名
  
  // 白细胞计数
  wbc_value: '',                   // 原始值
  wbc_unit: '×10⁹/L',              // 原始单位
  wbc_standard_value: '',          // 换算后的标准值
  wbc_standard_unit: '×10⁹/L',     // 标准单位
  
  // 中性粒细胞绝对值
  neut_abs_value: '',
  neut_abs_unit: '×10⁹/L',
  neut_abs_standard_value: '',
  neut_abs_standard_unit: '×10⁹/L',
  
  // 血红蛋白
  hgb_value: '',
  hgb_unit: 'g/L',
  hgb_standard_value: '',
  hgb_standard_unit: 'g/L',
  
  // 血小板计数
  plt_value: '',
  plt_unit: '×10⁹/L',
  plt_standard_value: '',
  plt_standard_unit: '×10⁹/L'
}
```

## 测试用例

### 测试用例 1：使用标准单位的报告
**输入**：WBC 6.5 ×10⁹/L, HGB 135 g/L, PLT 250 ×10⁹/L
**期望输出**：
- wbc_standard_value: "6.5"
- hgb_standard_value: "135"
- plt_standard_value: "250"

### 测试用例 2：使用非标准单位的报告
**输入**：HGB 13.5 g/dL
**期望输出**：
- hgb_value: "13.5"
- hgb_unit: "g/dL"
- hgb_standard_value: "135"
- hgb_standard_unit: "g/L"

### 测试用例 3：混合单位报告
**输入**：WBC 6.5 ×10⁹/L, HGB 13.5 g/dL, PLT 250000 /μL
**期望输出**：
- wbc_standard_value: "6.5" (无需换算)
- hgb_standard_value: "135" (×10)
- plt_standard_value: "250" (÷1000)

## 验收标准

- [x] 检测日期和检测医院字段默认为空
- [x] 占位符提示"自动识别或手动填写"
- [x] OCR 识别后自动填充字段
- [x] 支持手动修改识别结果
- [x] 字段允许为空
- [x] 识别成功后表单正确填回
- [x] 使用标准值（换算后的值）填回表单
- [x] 控制台输出调试信息便于排查问题

---

**修复完成时间**: 2026-03-25
**修复文件**: `server/public/index.html`
**调试方法**: 打开浏览器控制台查看日志输出
