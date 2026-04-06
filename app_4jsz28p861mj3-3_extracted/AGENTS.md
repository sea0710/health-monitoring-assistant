# 愈见·血常规监测助手 - 需求拆解文档

## 产品概述

- **产品类型**: 医疗健康监测工具
- **场景类型**: prototype - app
- **目标用户**: 肿瘤患者及家属（内部测试用户）
- **核心价值**: 实现「上传报告→OCR识别→异常解读→趋势查看」的核心业务流程
- **界面语言**: 中文
- **主题偏好**: light（浅蓝色/浅绿色主色调）
- **导航模式**: 路径导航
- **导航布局**: 无（移动端应用流程，页面间通过按钮/返回键跳转）

---

## 页面结构总览

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 登录/注册 | `LoginPage.tsx` | `/login` | 一级 | 应用入口 |
| 患者档案创建 | `PatientCreatePage.tsx` | `/patient/create` | 二级 | 登录页 → 新用户登录成功 |
| 病历夹列表 | `HomePage.tsx` | `/home` | 一级 | 登录页（老用户）/患者档案创建页 → 保存成功 |
| 报告上传 | `ReportUploadPage.tsx` | `/report/upload` | 二级 | 病历夹列表页 → 右上角「+」按钮 |
| 报告详情 | `ReportDetailPage.tsx` | `/report/:id` | 二级 | 病历夹列表页 → 列表项点击 / 报告上传页 → 确认归档 |
| 报告编辑 | `ReportEditPage.tsx` | `/report/:id/edit` | 三级 | 报告详情页 → 右上角「编辑」按钮 |
| 指标趋势图 | `TrendsPage.tsx` | `/trends` | 二级 | 报告详情页 → 「查看趋势图」悬浮按钮 |

> **页面类型说明**：
> - **一级页面**：应用主要入口，可通过直接访问路由进入
> - **二级页面**：从一级页面通过操作进入
> - **三级页面**：从二级页面通过操作进入（编辑模式复用上传页布局）

---

## 插件规划

| 插件实例名称 | 基于官方插件 | 业务用途 | 输出模式 | 所属页面 |
|------------|-----------|---------|---------|---------|
| ocr_blood_report | `ai-image-to-json` | 识别血常规报告图片，提取结构化指标数据 | stream | 报告上传页 |

---

## 导航配置

- **导航布局**: 无（移动端应用，采用页面栈导航）
- **导航方式**: 每个页面顶部配备返回按钮，底部配备操作按钮
- **页面流转**:
  ```
  [登录页] 
    → 新用户 → [患者档案创建页] → [病历夹列表页（首页）]
    → 老用户 → [病历夹列表页（首页）]
  
  [病历夹列表页]
    → [+]按钮 → [报告上传页] → [报告详情页]
    → 列表项点击 → [报告详情页]
  
  [报告详情页]
    → 编辑按钮 → [报告编辑页]
    → 趋势图按钮 → [指标趋势图页]
  ```

---

## 功能列表

### 登录/注册页 (`/login`)

- **页面目标**: 完成用户身份验证，区分新老用户并引导至对应流程
- **功能点**:
  - **Logo展示**: 顶部展示产品Logo占位图及产品名称「愈见・血常规监测助手」
  - **手机号输入**: 11位手机号格式校验，仅支持国内手机号
  - **密码输入**: 6位及以上密码，支持隐藏/显示切换
  - **登录/注册按钮**: 统一按钮，点击后校验格式，新用户跳转档案创建页，老用户跳转病历夹列表页
  - **本地存储模拟**: 使用飞书妙搭本地存储记录登录状态
  - **合规免责声明**: 底部固定展示「本工具仅供内部测试与健康科普参考，不构成任何诊疗建议，不能替代执业医师的专业判断」
  - **扩展预留**: 预留微信扫码登录按钮位置（当前隐藏）、忘记密码入口（当前隐藏）

### 患者档案创建页 (`/patient/create`)

- **页面目标**: 收集患者基础信息，创建患者档案
- **功能点**:
  - **返回导航**: 顶部返回按钮
  - **姓名输入**: 必填项，占位符「请输入患者姓名」，非空校验
  - **扩展字段预留**: 性别、出生年月、肿瘤类型、治疗方案、主管医生、治疗医院字段位置预留（当前隐藏）
  - **保存按钮**: 底部固定全宽按钮，校验通过后跳转病历夹列表页
  - **数据存储**: 使用飞书妙搭数据表格存储患者档案数据

### 病历夹列表页 (`/home`)

- **页面目标**: 展示患者档案概览及历史报告列表，作为应用首页
- **功能点**:
  - **页面标题**: 「我的病历夹」
  - **新增报告按钮**: 右上角「+」按钮，点击跳转报告上传页
  - **患者信息卡片**: 展示患者姓名、报告总数（模拟数据）
  - **报告列表**: 数据列表组件，按检测时间倒序排列
  - **列表项内容**: 报告类型（固定「血常规」）、检测时间、核心异常提示（如「白细胞↓ 中性粒细胞↓」，无异常显示「指标正常」）
  - **异常预警色**: 异常项用橙色/红色背景标记
  - **列表交互**: 点击列表项跳转报告详情页，支持下拉刷新（模拟）
  - **扩展预留**: 多患者切换下拉菜单位置（当前隐藏）、报告检索输入框位置（当前隐藏）

### 报告上传页 (`/report/upload`)

- **页面目标**: 上传血常规报告图片，展示OCR识别结果并支持手动修正
- **功能点**:
  - **返回导航**: 顶部返回按钮
  - **图片上传区域**: 飞书妙搭图片上传组件，支持相机拍摄、相册选择，带引导框占位提示「请对齐血常规报告边框拍摄」
  - **OCR识别接口**: 调用 `ocr_blood_report` 插件，预留阿里云OCR API对接位置
  - **识别结果预览**: 表单组件展示识别结果，支持手动编辑
  - **核心字段高亮**: 优先展示检测医院、检测时间、WBC、NEUT#、NEUT%、RBC、HGB、PLT
  - **其他指标折叠**: 其他血常规指标折叠展示，点击展开
  - **异常标记**: 异常指标用红色字体+↑↓标记
  - **底部操作按钮**: 「重新上传」「确认归档」按钮左右排列，固定在底部
  - **数据归档**: 点击确认归档后数据存入数据表格，跳转报告详情页
  - **扩展预留**: PDF文件上传入口（当前隐藏）、批量上传按钮位置（当前隐藏）

### 报告详情页 (`/report/:id`)

- **页面目标**: 展示单份报告的完整信息、异常分级预警及健康解读
- **功能点**:
  - **返回导航**: 顶部返回按钮
  - **编辑按钮**: 右上角「编辑」按钮，点击进入编辑模式
  - **基础信息卡片**: 检测医院、检测时间、患者姓名
  - **异常分级预警卡片**: 标签组件展示异常等级（绿色-正常、黄色-Ⅰ度、橙色-Ⅱ-Ⅲ度、红色-Ⅳ度），列表展示异常指标及参考值
  - **肿瘤场景解读卡片**: 基础解读、居家监测建议，文字展示，预留折叠/展开功能
  - **完整指标列表卡片**: 折叠展示，点击展开查看所有指标
  - **合规免责声明**: 底部固定展示（同登录页）
  - **趋势图悬浮按钮**: 右下角圆形悬浮按钮「查看趋势图」，点击进入趋势图页
  - **解读接口预留**: 预留后端解读接口调用位置

### 报告编辑页 (`/report/:id/edit`)

- **页面目标**: 允许用户修改已归档报告的人工识别结果
- **功能点**:
  - **页面复用**: 复用报告上传页布局，标记为编辑模式
  - **数据回显**: 加载已有报告数据填充表单
  - **保存修改**: 更新数据表格中的记录

### 指标趋势图页 (`/trends`)

- **页面目标**: 展示核心指标的历史变化趋势，辅助长期监测
- **功能点**:
  - **返回导航**: 顶部返回按钮
  - **指标切换栏**: 标签页组件展示6项核心指标（WBC、NEUT#、NEUT%、RBC、HGB、PLT），点击切换
  - **趋势图展示**: ECharts图表组件展示折线图，横轴为检测时间，纵轴为指标数值
  - **参考区间标注**: 灰色区间标注参考值上下限
  - **异常点标记**: 超出参考范围的点用橙色/红色标记
  - **极值标注**: 标注最高值、最低值、首次异常节点
  - **数据点交互**: 点击折线点弹窗展示对应报告的检测时间、具体数值
  - **趋势数据接口预留**: 预留后端趋势数据接口调用位置
  - **扩展预留**: 多指标对比开关（当前隐藏）

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_bcm_user` | 当前登录用户信息，类型为 `IUser` | 所有页面 |
| `__global_bcm_currentPatient` | 当前选中患者，类型为 `IPatient` | 病历夹列表页、报告上传页、报告详情页、趋势图页 |
| `__global_bcm_reports` | 报告列表，类型为 `IReport[]` | 病历夹列表页 |
| `__global_bcm_currentReport` | 当前查看/编辑的报告，类型为 `IReport` | 报告详情页、报告编辑页 |
| `__global_bcm_indicators` | 指标数据列表，类型为 `IIndicator[]` | 报告详情页、趋势图页 |

```ts
interface IUser {
  user_id: string;
  phone: string;
  password: string;
  create_time: string;
  update_time: string;
  nickname?: string;
  avatar?: string;
  wechat_openid?: string;
}

interface IPatient {
  patient_id: string;
  user_id: string;
  name: string;
  create_time: string;
  update_time: string;
  gender?: string;
  birthday?: string;
  tumor_type?: string;
  treatment_plan?: string;
}

interface IReport {
  report_id: string;
  patient_id: string;
  report_type: string;
  test_time: string;
  test_hospital: string;
  raw_image_url: string;
  create_time: string;
  update_time: string;
  is_edited?: boolean;
  source?: string;
}

interface IIndicator {
  indicator_id: string;
  report_id: string;
  indicator_code: string;
  indicator_name: string;
  test_value: number;
  reference_min?: number;
  reference_max?: number;
  unit: string;
  is_abnormal: boolean;
  abnormal_level: 'normal' | 'warning' | 'danger' | 'critical';
  trend?: string;
  remark?: string;
}
```

---

## API 预留清单

| 接口位置 | 请求方法 | 接口路径 | 用途 | 当前实现 |
|---------|---------|---------|------|---------|
| 图片上传后 | POST | `/api/ocr` | 阿里云OCR识别 | 模拟数据填充 |
| 报告归档 | POST | `/api/reports` | 提交报告数据 | 存入本地数据表格 |
| 报告详情 | GET | `/api/reports/{id}` | 获取报告详情 | 本地数据查询 |
| 解读内容 | GET | `/api/interpretations/{id}` | 获取AI解读 | 模拟数据填充 |
| 趋势数据 | GET | `/api/trends/{patientId}` | 获取时间序列数据 | 模拟数据填充 |

-------

# UI 设计指南

> **场景类型**: `prototype - app`（应用架构设计）
> **子场景**: 多页面健康管理工具
> **确认检查**: 本指南适用于具有明确业务流程的多页面应用（登录→建档→上传→查看→趋势），包含复杂表单、数据展示和状态管理。如果仅为单页数据看板，请使用 `dashboard` 模板。

> ℹ️ Section 1-2 为设计意图与决策上下文。Code agent 实现时以 Section 3 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解
- **目标用户**: 肿瘤患者及家属（内部测试阶段），处于焦虑与信息获取需求并存的心理状态，需要简单、明确、温暖的界面降低认知负担
- **核心目的**: 通过「上传-识别-解读-趋势」的闭环，帮助用户自主监测血常规指标变化，建立对健康状况的掌控感
- **期望情绪**: 信任（专业医疗感）、安心（温暖不冰冷）、清晰（信息层级分明）、可控（操作反馈明确）
- **需避免的感受**: 焦虑（避免 alarm red 大面积使用）、混乱（避免信息过载）、医疗化的冰冷感（避免纯医院白+深灰）、廉价感（避免过度装饰）

### 1.2 设计语言
- **Aesthetic Direction**: 温和的医疗科技风格——将临床的精确性包裹在人文关怀的视觉语言中，用有机的圆角和柔和的色彩过渡替代传统医疗软件的锐利边缘
- **Visual Signature**: 
  1. 蓝绿渐变主色（生命感+医疗信任）
  2. 大圆角卡片（16-24px，亲和无攻击性）
  3. 底部固定操作栏（移动端手势友好）
  4. 分级色标系统（绿-黄-橙-红，异常程度一目了然）
  5. 充足留白（呼吸感，减少信息压迫）
- **Emotional Tone**: 「专业的陪伴者」——既不冰冷疏离，也不过度热情，而是稳定、可靠、易于接近
- **Design Style**: **Soft Blocks 柔色块** — 医疗健康工具需降低心理防御，柔色矩形重叠 + 半透明层次营造温和安全感；辅助 **Rounded 圆润几何** — 胶囊按钮与大圆角输入框强化亲和力

## 2. Design Principles (设计理念)

1. **温和而警觉**：用暖色调建立亲和力，但异常预警必须清晰可辨（绿-黄-橙-红四级色标不可混淆）
2. **移动优先，单手友好**：核心操作集中在屏幕下半区，底部固定按钮≥44px触控区域，避免顶部导航过度堆砌
3. **一次只做一件事**：每个页面聚焦单一核心任务（登录/上传/查看），避免多任务并行造成的焦虑
4. **预留即承诺**：隐藏字段和预留位置保持视觉整洁，但需通过微文案或图标暗示可扩展性
5. **合规即设计**：免责声明不是补丁，而是设计元素的一部分，固定展示但视觉上不突兀（低对比度灰色条带）

## 3. Color System (色彩系统)

> **App 场景配色规则**：基于医疗健康场景自主设计，主色选用蓝绿色系（Teal）平衡专业感与生命活力，强调色用于异常预警层级。

**配色设计理由**：肿瘤患者心理敏感，纯白背景+纯黑文字的高对比易产生压迫感。选用极浅的米灰背景（暖调）降低刺激，主色使用蓝绿色（医疗信任+生命活力），避免传统医院蓝的单冷漠感。异常预警采用光谱递进（绿黄橙红），符合医疗认知习惯。

### 3.1 主题颜色

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|-----|---------|----------------|--------|---------|
| bg | `--background` | `bg-background` | `hsl(40 20% 98%)` | 暖调极浅米灰，替代纯白减少眼部刺激 |
| surface | `--card` | `bg-card` | `hsl(0 0% 100%)` | 纯白卡片，浮于背景之上 |
| text | `--foreground` | `text-foreground` | `hsl(220 20% 20%)` | 深炭灰，避免纯黑过于锐利 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | `hsl(220 10% 50%)` | 中灰，用于次要信息、占位符 |
| primary | `--primary` | `bg-primary` | `hsl(174 60% 45%)` | 主品牌色，蓝绿色（Teal），医疗专业感+生命力 |
| primary-foreground | `--primary-foreground` | `text-primary-foreground` | `hsl(0 0% 100%)` | 主色上的白色文字 |
| accent | `--accent` | `bg-accent` | `hsl(174 50% 96%)` | 极浅青灰，用于hover/focus状态背景 |
| accent-foreground | `--accent-foreground` | `text-accent-foreground` | `hsl(174 60% 35%)` | accent背景上的深青文字 |
| border | `--border` | `border-border` | `hsl(220 13% 90%)` | 浅灰边框， subtle divider |
| input | `--input` | `border-input` | `hsl(220 13% 85%)` | 输入框边框略深于普通边框 |

### 3.2 语义颜色（医疗分级预警系统）

> 严格遵循医疗异常分级色彩语义，用于指标异常标记、标签、趋势图节点

| 角色 | 用途 | HSL 值 | 设计说明 |
|-----|------|--------|---------|
| success | 正常/绿色（Ⅰ级） | `hsl(142 71% 45%)` | 生命绿，表示指标正常 |
| warning | Ⅰ度异常/黄色 | `hsl(45 95% 50%)` | 警示黄，轻度关注 |
| danger | Ⅱ-Ⅲ度异常/橙色 | `hsl(25 95% 53%)` | 警戒橙，中度风险 |
| critical | Ⅳ度异常/红色 | `hsl(0 72% 51%)` | 危急红，重度风险 |

> **使用规则**：文字标记用纯色，背景标记用对应颜色10%透明度（如 `bg-red-500/10` + `text-red-600`）

### 3.3 扩展色（图表与装饰）

| 角色 | HSL 值 | 用途 |
|-----|--------|------|
| chart-1 | `hsl(174 60% 45%)` | 趋势图主折线（同primary） |
| chart-2 | `hsl(200 80% 55%)` | 次指标线（蓝） |
| chart-3 | `hsl(260 60% 60%)` | 辅助线（紫） |
| chart-4 | `hsl(30 90% 55%)` | 辅助线（橙） |

## 4. Typography (字体排版)

- **Heading**: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif — 中文系统字体，确保移动端清晰渲染
- **Body**: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif — 与标题保持一致，通过字重区分层级
- **数字专用**: "SF Mono", "Menlo", "Roboto Mono", monospace — 血常规数值等宽显示，便于对齐比较

**字体导入**（如使用 Web 字体）：
```css
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&display=swap');
```

**排版层级**：

| 层级 | 尺寸 | 字重 | 行高 | 用途 |
|-----|------|-----|------|-----|
| Page Title | `text-xl` (20px) | `font-semibold` (600) | `leading-tight` | 页面标题（「我的病历夹」） |
| Card Title | `text-lg` (18px) | `font-semibold` (600) | `leading-snug` | 卡片标题（「异常指标预警」） |
| Section Title | `text-base` (16px) | `font-medium` (500) | `leading-snug` | 小节标题（「基础解读」） |
| Body | `text-base` (16px) | `font-normal` (400) | `leading-relaxed` (1.625) | 正文内容 |
| Small | `text-sm` (14px) | `font-normal` (400) | `leading-normal` | 次要信息、标签 |
| Caption | `text-xs` (12px) | `font-normal` (400) | `leading-normal` | 时间戳、单位、免责声明 |

## 5. Global Layout Structure (全局布局结构)

### 5.1 导航策略
- **导航布局**: **无 Sidebar/Topbar**（移动端应用，采用页面栈导航）
- **页面间导航**: 
  - 每个页面顶部左侧配备「返回」按钮（ ChevronLeft 图标 + 「返回」文字）
  - 页面标题居中或左对齐（根据页面层级）
  - 页面流转通过底部主按钮或悬浮按钮触发

### 5.2 Page Content Zones (页面区块配置)

**Standard Content Zone（全页面统一）**:
- **Maximum Width**: `max-w-md` (448px) — 移动端优先，保持内容在舒适阅读区
- **Padding**: `px-4` (16px) 水平边距，`py-6` (24px) 垂直边距
- **Alignment**: `mx-auto` 居中
- **Vertical Spacing**: `space-y-4` (16px) 区块间距

**底部固定操作栏（Bottom Action Bar）**:
- **Position**: `fixed bottom-0 left-0 right-0`
- **Background**: `bg-white` + `border-t border-border` + `shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]`（顶部阴影暗示可滚动）
- **Padding**: `p-4` + `pb-safe`（适配 iPhone 底部安全区）
- **Z-Index**: `z-50`
- **内容约束**: 内部使用 `max-w-md mx-auto` 与上方内容对齐

**页面安全区（应对底部固定栏）**:
- 页面底部需预留 `pb-24` (96px) 以上空间，避免内容被固定栏遮挡

## 6. Visual Effects & Motion (视觉效果与动效)

### 6.1 圆角系统
| 元素 | 圆角值 | 说明 |
|-----|-------|------|
| 页面卡片 | `rounded-2xl` (16px) | 大圆角营造柔和感 |
| 按钮（主） | `rounded-full` | 胶囊形，亲和力强 |
| 按钮（次） | `rounded-xl` (12px) | 稍小的圆角区分层级 |
| 输入框 | `rounded-xl` (12px) | 与卡片呼应 |
| 标签/徽章 | `rounded-full` | 胶囊标签 |
| 悬浮按钮（FAB） | `rounded-full` | 圆形，阴影突出 |
| 图片/上传区 | `rounded-xl` (12px) | 柔和边界 |

### 6.2 阴影系统
| 元素 | 阴影 | 说明 |
|-----|------|-----|
| 卡片（静态） | `shadow-sm` | 极浅阴影， subtle 层次 |
| 卡片（悬浮/上滑） | `shadow-md` | 稍重，用于底部操作栏 |
| 悬浮按钮（FAB） | `shadow-lg` | 强烈阴影，突出行动号召 |
| 模态框/弹窗 | `shadow-xl` | 最深阴影，阻断下层内容 |

### 6.3 动效与过渡
- **缓动函数**: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out) — 快速启动，缓慢结束，符合移动端手势预期
- **页面切换**: 水平滑动 (slide-horizontal) 300ms，模拟页面栈推进/弹出
- **按钮反馈**: 
  - Hover: `scale-[1.02]` + `brightness-95` 100ms
  - Active: `scale-[0.98]` 50ms
- **列表加载**: 骨架屏 shimmer 动画，避免空白焦虑
- **数字变化**: 计数器动画 (count-up) 用于关键指标展示

### 6.4 复杂背景文字处理
- **图片上传区背景**: 上传后图片作为背景时，上方叠加 `bg-gradient-to-t from-black/60 to-transparent`，确保白色文字可读
- **警告/提示条**: 有色背景（如 warning/10）上的文字使用对应深色（warning-dark），对比度 ≥ 4.5:1

## 7. Components (组件指南)

### 7.1 页面头部（Page Header）
- **结构**: 固定顶部 `sticky top-0 z-40`，高度 `h-14` (56px)
- **背景**: `bg-background/80 backdrop-blur-md`（滚动时模糊背景内容）
- **布局**: Flex，三栏式（返回按钮 | 标题 | 右侧操作）
- **标题**: `text-xl font-semibold text-foreground`，居中或左对齐
- **返回按钮**: `p-2 -ml-2 rounded-full hover:bg-accent`，图标 `w-5 h-5`
- **右侧操作**: 图标按钮（如编辑、+号），`p-2 -mr-2`

### 7.2 患者信息卡片（Patient Card）
- **背景**: `bg-primary text-primary-foreground`（蓝绿渐变或纯色）
- **圆角**: `rounded-2xl`
- **内边距**: `p-5`
- **内容布局**: 
  - 患者姓名：`text-2xl font-bold`
  - 报告数：`text-sm opacity-90`，右侧带箭头图标暗示可点击
- **阴影**: `shadow-md`

### 7.3 报告列表项（Report List Item）
- **背景**: `bg-surface`
- **边框**: `border-b border-border`（最后一项无下边框）
- **内边距**: `py-4 px-0`（水平边距由父容器控制）
- **布局**: Flex，左对齐内容，右对齐箭头
- **内容结构**:
  - 顶部行：报告类型标签（胶囊，灰底） + 检测时间（muted色）
  - 中间行：异常提示文字（正常时绿色，异常时对应预警色）
  - 异常标签：如有异常，右侧显示对应颜色圆点或「Ⅱ度」标签
- **点击态**: `active:bg-accent` 反馈

### 7.4 表单组件

**输入框（Input）**:
- **高度**: `h-12` (48px) — 保证触控面积
- **边框**: `border border-input rounded-xl`
- **背景**: `bg-surface`
- **焦点**: `ring-2 ring-primary/20 border-primary`
- **占位符**: `text-muted-foreground text-sm`
- **图标**: 左侧可预留图标位（如电话图标），`pl-10`

**标签（Label）**:
- **样式**: `text-sm font-medium text-foreground mb-1.5`
- **必填标记**: 红色星号 `text-critical` 紧跟标签后

**表单组（Form Group）**:
- **间距**: `space-y-5`（每组之间）
- **组内间距**: `space-y-1.5`（标签与输入框）

### 7.5 按钮系统

**主按钮（Primary）**:
- **尺寸**: `h-12` (48px) 全宽，`rounded-full`
- **背景**: `bg-primary`
- **文字**: `text-primary-foreground font-semibold text-base`
- **Hover**: `hover:bg-primary/90`
- **禁用**: `opacity-50 cursor-not-allowed`

**次要按钮（Secondary）**:
- **尺寸**: 同主按钮或 `h-10`
- **背景**: `bg-surface border border-border`
- **文字**: `text-foreground font-medium`
- **Hover**: `hover:bg-accent`

**幽灵按钮（Ghost）**:
- **背景**: 透明
- **文字**: `text-primary` 或 `text-muted-foreground`
- **Hover**: `hover:bg-accent`

**悬浮按钮（FAB - Floating Action Button）**:
- **位置**: `fixed bottom-20 right-4`（高于底部操作栏）
- **尺寸**: `w-14 h-14 rounded-full`
- **背景**: `bg-primary shadow-lg`
- **图标**: `w-6 h-6 text-white`
- **阴影**: `shadow-primary/30`（有色阴影）

### 7.6 数据展示卡片（Data Cards）

**指标卡片（KPI Card - 用于报告详情）**:
- **背景**: `bg-surface rounded-xl border border-border p-4`
- **布局**: Grid 或 Flex 排列
- **内容**:
  - 指标名：`text-sm text-muted-foreground`
  - 数值：`text-2xl font-bold font-mono text-foreground`（等宽字体）
  - 单位：`text-xs text-muted-foreground ml-1`
  - 异常标记：数值旁显示 `↑`/`↓` 及颜色（红/橙）
  - 参考值：`text-xs text-muted-foreground mt-1`（如「参考：4.0-10.0」）

**预警标签（Alert Badge）**:
| 等级 | 背景 | 文字 | 用途 |
|-----|------|-----|------|
| 正常 | `bg-success/10` | `text-success` | 指标正常 |
| Ⅰ度 | `bg-warning/10` | `text-warning` | 轻度异常 |
| Ⅱ-Ⅲ度 | `bg-danger/10` | `text-danger` | 中度异常 |
| Ⅳ度 | `bg-critical/10` | `text-critical` | 重度异常 |

**解读卡片（Interpretation Card）**:
- **背景**: `bg-surface rounded-xl`
- **标题区**: `p-4 border-b border-border`（标题 + 展开/折叠图标）
- **内容区**: `p-4 text-sm text-foreground leading-relaxed`
- **展开动画**: 高度过渡 300ms ease-out

### 7.7 图表组件（Trends Chart）
- **容器**: `bg-surface rounded-2xl p-4 shadow-sm`
- **标签页**: 
  - 容器：`bg-accent/50 rounded-xl p-1 flex`
  - 激活项：`bg-white shadow-sm rounded-lg text-primary font-medium`
  - 非激活：`text-muted-foreground hover:text-foreground`
- **折线图样式**:
  - 正常范围区间：浅灰背景 `bg-muted/30`
  - 折线：primary色，线宽 3px
  - 异常点：对应预警色圆点，直径 6px
  - 网格线：`border-border/50` 虚线
  - Tooltip: `bg-foreground text-background text-xs rounded-lg p-2 shadow-xl`

### 7.8 上传组件（Upload Zone）
- **默认态**: 
  - 边框：`border-2 border-dashed border-input rounded-xl`
  - 背景：`bg-accent/30`
  - 高度：`h-48`
  - 内容：上传图标 + 「点击或拖拽上传」+ 支持格式提示（小字）
- **拖拽悬停态**: `border-primary bg-primary/5`
- **上传中**: 进度条或旋转 loading 图标
- **预览态**: 图片覆盖全区域，`object-cover`，右上角删除按钮（圆形白底红叉）

### 7.9 免责声明（Disclaimer Bar）
- **位置**: 页面底部固定（在底部操作栏之上，或作为页面最后元素）
- **背景**: `bg-muted/30` 或透明
- **文字**: `text-xs text-muted-foreground text-center`
- **内边距**: `py-3 px-4`
- **内容**: 「本工具仅供内部测试与健康科普参考，不构成任何诊疗建议，不能替代执业医师的专业判断」

## 8. Page-Specific Guidelines (页面专属规范)

### 8.1 登录/注册页 (`/login`)
- **布局**: 垂直居中，顶部留白 `pt-20`，底部固定免责声明
- **Logo区**: 居中，图标 `w-20 h-20` 圆角方形或圆形，应用名称 `text-2xl font-bold text-primary mt-4`
- **表单区**: `mt-12 space-y-5`，输入框带图标（手机、锁）
- **按钮**: 主按钮全宽，「登录 / 注册」
- **扩展预留**: 微信登录按钮位置（当前隐藏，保留 `h-12` 占位空间或完全移除）

### 8.2 病历夹列表页 (`/home`) - 首页
- **头部**: 标题「我的病历夹」+ 右上角「+」按钮（圆形图标按钮 `w-10 h-10`）
- **患者卡片**: 顶部全宽卡片，展示姓名和报告数量，可点击进入档案编辑
- **列表区**: 
  - 标题「历史报告」`text-lg font-semibold mt-6 mb-3`
  - 列表容器 `bg-surface rounded-2xl shadow-sm divide-y divide-border`
  - 空状态：居中插图 + 「暂无报告，点击右上角添加」提示

### 8.3 报告上传页 (`/report/upload`)
- **分阶段展示**:
  1. **上传阶段**: 大上传区占据上半屏，底部留操作提示
  2. **识别阶段**: 图片预览（半高）+ 识别结果表单（半高，可滚动）
- **表单分区**:
  - 核心字段区：高亮边框或背景色区分
  - 其他指标区：默认折叠，点击展开（手风琴样式）
- **底部双按钮**: 「重新上传」（次要，左）+ 「确认归档」（主，右），固定在底部操作栏

### 8.4 报告详情页 (`/report/:id`)
- **卡片堆叠布局**: `space-y-4`，每张卡片独立 white bg + rounded-2xl + shadow-sm
- **卡片顺序**:
  1. 基础信息（医院、时间、姓名）
  2. 异常预警（如无异常显示「全部正常」绿色卡片）
  3. 专属解读（可折叠段落）
  4. 完整指标（折叠列表，Grid 布局展示所有指标）
- **悬浮按钮**: 右下角圆形 FAB，图标趋势图/折线图标，标签「趋势」

### 8.5 指标趋势图页 (`/trends`)
- **标签页**: 顶部横向滚动标签栏（6个指标），激活态有下划线或背景色
- **图表区**: 占据剩余屏高的 70%，最小高度 `h-80`
- **图例说明**: 底部小字说明「橙色点表示异常值」
- **交互**: 点击数据点弹出底部弹窗（Sheet）展示该次报告详情，而非页面跳转

## 9. Flexibility Note (灵活性说明)

> **多页面应用一致性原则**：所有页面共享相同的最大宽度（`max-w-md`）、圆角系统（卡片 16px，按钮胶囊）、间距体系（4px 倍数）。
>
> **允许的微调范围**：
> - 响应式适配：平板端可扩展至 `max-w-2xl`，采用双栏布局（左侧列表右侧详情）
> - 页面内局部间距：根据内容密度可在 `space-y-4` 至 `space-y-6` 间调整
> - 图表高度：根据数据点数量在 `h-64` 至 `h-96` 间调整
>
> **禁止的随意变更**：
> - ❌ 不同页面使用不同的主色调或圆角风格
> - ❌ 移动端使用 Sidebar 导航（必须用页面栈）
> - ❌ 异常预警色值变更（绿黄橙红医疗语义固定）

## 10. Signature & Constraints (设计签名与禁区)

### DO (视觉签名)
1. **大圆角白色卡片浮于暖灰背景**: `bg-white rounded-2xl shadow-sm` on `bg-background`（米灰）
2. **蓝绿色主行动按钮**: `bg-primary rounded-full h-12`，用于所有主操作（保存、确认、登录）
3. **四级色标系统**: 任何异常状态必须通过绿 `hsl(142 71% 45%)`、黄 `hsl(45 95% 50%)`、橙 `hsl(25 95% 53%)`、红 `hsl(0 72% 51%)` 表达
4. **底部固定操作栏**: 所有表单页面底部必须有 `fixed bottom-0` 操作区，白底带顶部阴影
5. **等宽数字字体**: 所有血常规数值使用 `font-mono` 确保对齐可比性

### DON'T (禁止做法)
- ❌ 使用纯黑 `text-black` 或纯白 `bg-white` 背景（必须用暖调米灰）
- ❌ 异常预警仅用文字描述而无色标（必须色标+文字双重编码）
- ❌ 输入框高度小于 44px（不符合移动端触控规范）
- ❌ 使用红色作为品牌主色（避免医疗焦虑，主色必须用蓝绿）
- ❌ 页面内容贴底无安全边距（必须预留底部操作栏空间 `pb-24`）
- ❌ 捏造数据：禁止使用 Math.random() 生成、凭空编造数值、或虚构不存在的指标，所有数据必须来自用户提供的真实内容