# 复查提醒功能优化方案（最终执行版）

> **原则**：严格按照 PRD 实现，文案以 PRD 为准，交互稿有差异处以 PRD 为准。
> **已确认事项**：①「其他复查」模式本期一起实现 ②已订阅项编辑后自动降级pending，重新保存时拉起订阅授权 ③所有状态（含pending）写入DB ④测试消息按钮隐藏不删除

---

## 一、变更概览

| 维度 | 当前 | 目标（PRD） |
|------|------|-------------|
| 页面标题 | 提醒设置 | 设置监测提醒 |
| 顶部区域 | 患者卡片 + 简单列表头 | 规则配置区（支持双模式切换） |
| 模式数量 | 单一 | 双模式：血常规复查 + 其他复查 |
| 列表结构 | 单一平铺列表，switch开关 | 分区：待提醒（可编辑+保存/删除）+ 历史提醒（只读置灰） |
| 添加方式 | 弹窗Modal添加 | 内联添加 + 一键批量生成 |
| 状态管理 | is_enabled (switch) | status: pending(未保存) / subscribed(已订阅) |
| 数据模型 | 批量覆盖式保存 | 单条CRUD，pending也写入DB |

---

## 二、数据模型设计

### 2.1 reminders 集合字段扩展

```javascript
{
  _id: "xxx",
  patient_id: "xxx",
  openid: "oXxJ...",
  reminder_date: "2026-04-11",
  reminder_time: "09:00",
  is_enabled: true,

  status: "subscribed",
  source: "auto",
  mode: "blood_routine",
  created_at: Date,
  updated_at: Date
}
```

### 2.2 status 与 is_enabled 映射

| status | is_enabled | checkReminders行为 |
|--------|-----------|-------------------|
| `pending` | `false` | 不发送 |
| `subscribed` | `true` | 正常发送 |

checkReminders 无需修改。

### 2.3 已订阅项编辑后的状态流转

```
已订阅(status=subscribed, is_enabled=true)
    ↓ 用户修改日期或时间
自动降级(status=pending, is_enabled=false)，原订阅失效不下发
    ↓ 用户点击「保存」
校验 → 拉起订阅授权弹窗
    ├── 允许 → status=subscribed, is_enabled=true → 新订阅生效
    └── 拒绝 → 保持 pending，Toast提示
```

### 2.4 API 变更

| 接口 | 变更 |
|------|------|
| `getReminders` | 不变 |
| `createReminder` | 保留不变 |
| **新增 `addReminder`** | 单条添加（含status/source/mode，is_enabled=false） |
| **新增 `updateReminder`** | 单条更新（改日期/时间/status/is_enabled） |
| `deleteReminder` | 不变 |

---

## 三、页面结构设计（严格按PRD）

### 整体布局

```
┌─────────────────────────────────────┐
│  ‹ 返回      设置监测提醒            │
├─────────────────────────────────────┤
│                                     │
│  📅 化疗结束时间                     │
│  最近一次化疗结束日期 *               │
│  ┌───────────────────────────┐     │
│  │  2026/04/04                │     │
│  └───────────────────────────┘     │
│                                     │
│  基于化疗结束时间（2026-04-04）      │
│  ┌─────────────────────────────┐   │
│  │ 🔔 一键设置复查提醒          │   │
│  │   （+7天、+14天）            │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  🔔 待提醒    [2]      [+ 添加]    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ①   日期          时间    ×  │   │
│  │    2026/04/11     09:00     │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ②   日期          时间    ×  │   │
│  │    2026/04/18     09:00     │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  🕐 历史提醒    [2]                 │
│                                     │
│  ○ 2026-03-31 09:00      [已过期]  │
│  ○ 2026-04-03 09:00      [已过期]  │
│                                     │
│  历史提醒仅显示，不再发送通知         │
│                                     │
└─────────────────────────────────────┘
```

---

## 四、功能模块详细设计

### 模块一：规则配置区

#### 4.1 模式切换 UI

在规则配置区顶部增加 segmented control：
- 左选项：「血常规复查」（默认选中）
- 右选项：「其他复查」

切换后下方输入区域动态变化。

#### 4.1.1 血常规复查模式

**UI 元素（严格按PRD文案）：**
- 图标：📅 + 标题：「化疗结束时间」
- 标签：「最近一次化疗结束日期 *」（* 红色必填）
- 控件：日期选择器 picker(mode=date)，默认=今天，格式 YYYY/MM/DD
- 提示文字：「基于化疗结束时间（YYYY-MM-DD）」（动态展示所选日期）
- 按钮：🔔 + 「一键设置复查提醒（+7天、+14天）」

**计算逻辑：**
```
输入: chemoEndDate = "2026-04-04"

条目1: reminder_date = chemoEndDate + 6天 = "2026-04-10" (第7天复查,提前1天)
条目2: reminder_date = chemoEndDate + 13天 = "2026-04-17" (第14天复查,提前1天)

每条: reminder_time="09:00", mode="blood_routine", source="auto", status="pending", is_enabled=false
```

**一键设置逻辑：**
1. 校验化疗结束日期 → 未填则 Toast
2. 计算2个提醒日期（+6天、+13天）
3. 去重检查：与当前所有提醒（含pending和subscribed）比对日期
4. 将不重复的条目写入 DB（addReminder 循环，is_enabled=false, status=pending）
5. 重新加载列表
6. Toast 反馈（全部新增/部分重复/全部重复）

#### 4.1.2 其他复查模式（本期一起实现）

**UI 元素（严格按PRD）：**
- 图标 + 标题：「其他复查」
- 输入项1标签：「上次复查时间 *」→ 日期选择器
- 输入项2标签：「频率」→ picker 选择器，选项：[1个月, 3个月, 6个月]
- 提示文字：动态计算预览
- 按钮：🔔 + 「一键设置复查提醒（复查前5天提醒）」

**计算逻辑：**
```
输入: lastReviewDate = "2026-01-15", frequency = "3个月"

nextReviewDate = lastReviewDate + 3个月 = "2026-04-15"
reminder_date = nextReviewDate - 5天 = "2026-04-10"

生成1条: reminder_date="2026-04-10", reminder_time="09:00",
        mode="other_review", source="auto", status="pending", is_enabled=false
```

**频率映射：**

| 频率 | 计算方式 |
|------|---------|
| 1个月 | 上次日期 + 25天（30天复查 - 5天提醒） |
| 3个月 | 上次日期 + 85天（90天复查 - 5天提醒） |
| 6个月 | 上次日期 + 175天（180天复查 - 5天提醒） |

> 使用 JS Date setMonth() 自动处理跨月/闰年。

---

### 模块二：待提醒列表

#### 4.2.1 列表头部（严格按PRD文案）

- 左侧：🔔 + 「待提醒」（注意是「待提醒」不是「待醒」）
- 中间：数量徽标 `[N]`（灰色圆角背景）
- 右侧：「+ 添加」按钮

#### 4.2.2 列表项布局

```
┌────────────────────────────────────────┐
│  ①   ┌────────────┐  ┌────────────┐  │
│      │  日期       │  │  时间       │  │ inline picker
│      │  2026/04/11 │  │  09:00      │  │
│      └────────────┘  └────────────┘  │
│                               [保存/×]│
└────────────────────────────────────────┘
```

- 序号：圆形数字 ①②③... teal背景白字
- 日期选择器：inline picker，格式 YYYY/MM/DD
- 时间选择器：inline picker，格式 HH:mm
- 右侧操作：
  - status=pending → 「保存」文字链接（teal色）
  - status=subscribed → 「×」删除图标（红色圆圈）

#### 4.2.3 保存流程

**场景A：pending 项点击「保存」**
1. 获取该条目的 reminder_date 和 reminder_time
2. 校验：reminder_date+time >= 当前时间？→ 否则 Toast("日期不能早于当前时间")
3. wx.requestSubscribeMessage 拉起授权弹窗
   - 允许 → 继续
   - 拒绝 → Toast("未开启通知权限，无法保存提醒")，保持 pending
4. updateReminder: status="subscribed", is_enabled=true
5. 前端更新：右侧变为 × 删除图标
6. Toast("保存成功")

**场景B：已订阅项编辑后点击「保存」重新订阅**
- 用户修改已订阅项的日期/时间 → 自动降级为 pending(is_enabled=false) → 右侧变为「保存」
- 用户点击「保存」→ 走场景A完整流程 → 新订阅生效，旧订阅自然失效

#### 4.2.4 手动添加（+ 添加）

点击后在列表末尾插入并写入 DB：
- reminder_date=今天, reminder_time=09:00, status=pending, source=manual
- mode 继承当前选中模式
- is_enabled=false
- 用户在内联 picker 中修改后点保存

#### 4.2.5 内联编辑行为

- 点击 picker → 选值 → 立即更新显示
- **若该条目之前是 subscribed**：
  - 自动调用 updateReminder 降级为 pending(is_enabled=false)
  - 右侧从 × 变为「保存」
  - 可选 Toast："已修改，请重新保存以生效"
- **若本来就是 pending**：仅更新前端显示，等用户点保存时提交

#### 4.2.6 删除流程

点击 × → 确认弹窗（标题:"确认删除"，内容:"确定要删除此提醒吗？"）→ 确认后 deleteReminder → 移除 → Toast("删除成功")

---

### 模块三：历史提醒

#### 4.3.1 分区逻辑（前端 loadReminders 时执行）

```javascript
function splitReminders(allReminders) {
  const now = new Date()
  const todayStr = formatDate(now)
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const pending = [], history = []
  for (const r of allReminders) {
    const isExpired = r.reminder_date < todayStr ||
      (r.reminder_date === todayStr && r.reminder_time <= currentTime)
    isExpired ? history.push(r) : pending.push(r)
  }
  return { pending, history }
}
```

#### 4.3.2 显示条件

- `wx:if="{{history.length > 0}}"` 整个卡片区块条件渲染
- 历史为空时不显示该区域

#### 4.3.3 样式（严格按PRD）

- 标题：🕐 + 「历史提醒」+ 徽标 `[N]`
- 列表项：文字 #9ca3af，左侧 ○ 图标，纯文本 `2026-03-31 09:00`，右侧「已过期」灰色胶囊标签，opacity 0.7
- 底部：「历史提醒仅显示，不再发送通知」（居中灰色小字）

---

### 模块四：空状态

| 区域 | 条件 | 展示内容（严格按PRD） |
|------|------|---------------------|
| 待提醒空 | pending==0 | 铃铛灰图 + 「暂无待提醒」+ 「点击"一键设置"或手动添加」 |
| 历史空 | history==0 | 不渲染整个卡片区域 |

---

## 五、边界情况

### 5.1 重复检测
一键生成时跳过已有日期的条目，Toast 明确告知结果。

### 5.2 时间穿越
保存时 date+time <= 当前时间 → Toast("日期不能早于当前时间")，阻止保存。

### 5.3 订阅拒绝
requestSubscribeMessage 非 accept → Toast("未开启通知权限，无法保存提醒")，保持 pending。

### 5.4 数据持久化
所有状态（含 pending）均写入 DB（is_enabled=false），onShow 时重载，刷新不丢失。

### 5.5 测试按钮
隐藏不删除（wx:if="{{false}}" 或注释），保留代码以便调试时快速恢复。

---

## 六、云函数变更

### 6.1 report/index.js 新增 action

**addReminder：**
```javascript
async function addReminder(params) {
  const { patient_id, reminder } = params
  const { OPENID } = cloud.getWXContext()
  const result = await db.collection('reminders').add({
    data: {
      patient_id, openid: OPENID,
      reminder_date: reminder.reminder_date,
      reminder_time: reminder.reminder_time || '09:00',
      is_enabled: reminder.status === 'subscribed',
      status: reminder.status || 'pending',
      source: reminder.source || 'manual',
      mode: reminder.mode || 'blood_routine',
      created_at: new Date(), updated_at: new Date()
    }
  })
  return { code: 0, data: { _id: result._id } }
}
```

**updateReminder：**
```javascript
async function updateReminder(params) {
  const { reminder_id, updates } = params
  await db.collection('reminders').doc(reminder_id).update({
    data: { ...updates, updated_at: new Date() }
  })
  return { code: 0 }
}
```

### 6.2 checkReminders — 无需修改 ✅
### 6.3 sendMessage — 无需修改 ✅

---

## 七、文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `reminder.wxml` | 重写 | 三段式布局 + 双模式规则区 + 内联列表 + 历史 |
| `reminder.wxss` | 重写 | 规则区/编号/picker-inline/历史置灰/badge 全部新样式 |
| `reminder.js` | 重写 | 双模式/一键生成/内联编辑/保存订阅/分区 完整逻辑 |
| `report/index.js` | 修改 | 新增 addReminder、updateReminder action |

**移除：** 患者卡片 / Modal添加 / Switch开关 / 温馨提示独立卡片
**隐藏：** 测试消息推送按钮
**保留：** 免责声明 / 删除确认弹窗 / 返回导航

---

## 八、实施步骤

### Step 1: 云函数扩展（report）
- [ ] 新增 addReminder action
- [ ] 新增 updateReminder action
- [ ] 在路由 switch 中注册
- [ ] 部署 report 云函数

### Step 2: 页面 WXML 重构
- [ ] Header 标题改为「设置监测提醒」
- [ ] 模块一：规则配置区（模式切换 + 血常规模式 + 其他复查模式）
- [ ] 模块二：待提醒列表（头部 + 列表项模板 + 内联picker）
- [ ] 模块三：历史提醒区（条件渲染 + 置灰样式）
- [ ] 空状态组件
- [ ] 删除确认弹窗
- [ ] 免责声明
- [ ] 隐藏测试按钮

### Step 3: 页面 WXSS 重写
- [ ] 规则配置区卡片 + segmented control
- [ ] 编号圆圈 ①②③
- [ ] Inline picker 嵌入列表项
- [ ] 保存链接 / 删除图标
- [ ] 历史置灰（文字色+opacity）
- [ ] 已过期 badge
- [ ] 数量徽标 badge
- [ ] 各类空状态

### Step 4: 页面 JS 逻辑重写
- [ ] Data 结构：mode/chemoDate/lastReviewDate/frequency/pendingReminders/historyReminders
- [ ] handleModeChange 模式切换
- [ ] handleQuickCreate 一键生成（血常规+6/+13天，其他复查频率偏移-5天）
- [ ] onItemDateChange / onItemTimeChange 内联编辑（已订阅自动降级）
- [ ] handleSaveItem 保存流程（校验→订阅授权→updateReminder）
- [ ] handleManualAdd 手动添加
- [ ] loadReminders → splitReminders 分区
- [ ] 删除流程（复用确认弹窗）
- [ ] 工具函数（日期格式化、月份加法、去重）

### Step 5: 边界情况
- [ ] 重复检测 Toast
- [ ] 时间穿越校验
- [ ] 订阅拒绝处理
- [ ] 空状态展示

### Step 6: 测试验证
- [ ] 血常规一键生成 → 2条 pending
- [ ] 其他复查一键生成 → 1条 pending
- [ ] 保存 → 订阅弹窗 → 允许 → 变已订阅(×)
- [ ] 编辑已订阅 → 自动降级pending(保存) → 重新订阅
- [ ] 手动添加 → 修改 → 保存
- [ ] 删除 → 确认 → 移除
- [ ] 过期项归入历史（置灰+已过期）
- [ ] 历史为空时不显示
- [ ] 回归验证：定时触发器正常推送已订阅提醒
