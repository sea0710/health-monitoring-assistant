# 微信消息能力接入方案

## 一、现状分析

### 1.1 当前提醒功能实现

- **前端**: `miniprogram/pages/reminder/reminder.js` - 仅支持本地提醒记录管理
- **API**: `miniprogram/utils/api.js` - reminders接口为模拟实现，无实际功能
- **后端**: 无消息推送相关的云函数实现
- **数据库**: 无订阅消息相关的数据存储

### 1.2 技术架构

- **平台**: 微信小程序 + 微信云开发
- **现有云函数**: login, ocr, report
- **数据库**: 微信云数据库 (collections: users, patients, reports, indicators)

## 二、微信消息能力方案对比

### 方案A: 订阅消息 (推荐)

| 维度        | 评估                  |
| --------- | ------------------- |
| **实现复杂度** | 中等                  |
| **用户体验**  | 需用户主动订阅，每次订阅可发送多条消息 |
| **成本**    | 免费                  |
| **限制**    | 需用户授权，模板数量有限        |
| **适用场景**  | 复查提醒、异常指标预警         |

**实现步骤**:

1. 在小程序后台申请订阅消息模板
2. 用户创建提醒时调用 `wx.requestSubscribeMessage` 申请授权
3. 创建云函数 `sendReminder` 定时检查并发送消息
4. 使用云开发的定时触发器执行推送

### 方案B: 微信服务号 (备选)

| 维度        | 评估             |
| --------- | -------------- |
| **实现复杂度** | 高              |
| **用户体验**  | 需关注服务号，体验割裂    |
| **成本**    | 需认证服务号(300元/年) |
| **限制**    | 需用户关注服务号       |
| **适用场景**  | 需要长期运营的场景      |

### 方案C: 企业微信 (不推荐)

| 维度        | 评估        |
| --------- | --------- |
| **实现复杂度** | 高         |
| **用户体验**  | 需加入企业微信   |
| **成本**    | 企业微信认证费用  |
| **限制**    | 不适合个人用户场景 |

## 三、推荐方案: 订阅消息 + 定时触发器

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      微信小程序端                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 提醒设置页面  │  │ 订阅授权弹窗  │  │ 提醒列表管理      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      微信云开发                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 云函数:      │  │ 云函数:      │  │ 定时触发器        │  │
│  │ saveReminder │  │ sendReminder │  │ (每日9点执行)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 数据库:      │  │ 数据库:      │  │ 数据库:          │  │
│  │ reminders    │  │ subscriptions│  │ message_logs     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      微信服务端                              │
│              订阅消息推送服务                                │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 数据模型设计

#### reminders 集合

```javascript
{
  _id: String,              // 提醒ID
  patient_id: String,       // 患者ID
  user_id: String,          // 用户ID
  reminder_date: String,    // 提醒日期 (YYYY-MM-DD)
  reminder_time: String,    // 提醒时间 (HH:MM)
  reminder_type: String,    // 提醒类型: 'checkup' | 'medication'
  content: String,          // 提醒内容
  is_enabled: Boolean,      // 是否启用
  subscription_id: String,  // 关联的订阅记录ID
  create_time: Date,        // 创建时间
  update_time: Date         // 更新时间
}
```

#### subscriptions 集合

```javascript
{
  _id: String,              // 订阅ID
  user_id: String,          // 用户ID
  patient_id: String,       // 患者ID
  template_id: String,      // 订阅消息模板ID
  status: String,           // 订阅状态: 'active' | 'expired'
  subscribe_time: Date,     // 订阅时间
  expire_time: Date,        // 过期时间
  max_count: Number,        // 最大可发送次数
  used_count: Number        // 已使用次数
}
```

#### message\_logs 集合

```javascript
{
  _id: String,              // 日志ID
  reminder_id: String,      // 提醒ID
  user_id: String,          // 用户ID
  template_id: String,      // 模板ID
  status: String,           // 发送状态: 'success' | 'failed'
  send_time: Date,          // 发送时间
  result: Object            // 微信返回结果
}
```

### 3.3 订阅消息模板选择

#### 模板1: 复查提醒

- **模板ID**: 需在微信公众平台申请
- **场景**: 定期复查提醒
- **示例内容**:
  ```
  复查项目: 血常规检查
  复查时间: 2026-04-15
  备注: 请空腹前往医院
  ```

#### 模板2: 指标异常预警

- **模板ID**: 需在微信公众平台申请
- **场景**: 检测到异常指标时提醒
- **示例内容**:
  ```
  预警类型: 白细胞偏低
  当前值: 2.5 (参考范围: 3.5-9.5)
  建议: 请及时就医复查
  ```

## 四、实施计划

### Phase 1: 基础架构 (2-3天)

#### 任务1: 数据库集合创建

- [ ] 创建 `reminders` 集合
- [ ] 创建 `subscriptions` 集合
- [ ] 创建 `message_logs` 集合
- [ ] 配置数据库权限

#### 任务2: 云函数开发

- [ ] 创建 `reminder` 云函数
  - `saveReminder`: 保存提醒设置
  - `getReminders`: 获取提醒列表
  - `deleteReminder`: 删除提醒
- [ ] 创建 `sendMessage` 云函数
  - 发送订阅消息
  - 记录发送日志

#### 任务3: 定时触发器配置

- [ ] 配置每日定时触发器
- [ ] 实现提醒检查逻辑

### Phase 2: 小程序端开发 (2-3天)

#### 任务4: 提醒页面重构

- [ ] 集成真实API调用
- [ ] 添加订阅授权流程
- [ ] 优化UI交互

#### 任务5: 订阅授权流程

- [ ] 创建提醒时申请订阅授权
- [ ] 处理授权成功/失败回调
- [ ] 保存订阅记录

### Phase 3: 测试与上线 (1-2天)

#### 任务6: 功能测试

- [ ] 单元测试
- [ ] 集成测试
- [ ] 真机测试

#### 任务7: 上线准备

- [ ] 申请订阅消息模板
- [ ] 配置生产环境
- [x] 发布上线

## 五、技术实现细节

### 5.1 订阅授权代码示例

```javascript
// 申请订阅授权
async requestSubscribeMessage() {
  try {
    const res = await wx.requestSubscribeMessage({
      tmplIds: ['TEMPLATE_ID_1', 'TEMPLATE_ID_2']
    })
    
    if (res['TEMPLATE_ID_1'] === 'accept') {
      // 用户同意订阅
      await this.saveSubscription('TEMPLATE_ID_1')
    }
  } catch (err) {
    console.error('订阅授权失败:', err)
  }
}
```

### 5.2 云函数发送消息示例

```javascript
// 云函数: sendMessage
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: OPENID,
      templateId: 'TEMPLATE_ID',
      page: 'pages/reminder/reminder',
      data: {
        thing1: { value: '血常规复查' },
        time2: { value: '2026-04-15 09:00' },
        thing3: { value: '请空腹前往医院' }
      }
    })
    
    return { code: 0, data: result }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}
```

### 5.3 定时触发器配置

```json
// config.json
{
  "triggers": [
    {
      "name": "dailyReminder",
      "type": "timer",
      "config": "0 0 9 * * * *"
    }
  ]
}
```

## 六、风险评估与应对

### 6.1 用户授权率问题

- **风险**: 用户可能拒绝订阅授权
- **应对**:
  - 提供清晰的授权引导说明
  - 在关键节点(如创建提醒时)申请授权
  - 提供备用提醒方式(如本地通知)

### 6.2 订阅次数限制

- **风险**: 订阅消息有发送次数限制
- **应对**:
  - 合理规划提醒频率
  - 提供用户管理订阅的入口
  - 过期前提醒用户重新订阅

### 6.3 模板审核问题

- **风险**: 模板申请可能被拒
- **应对**:
  - 提前准备多个备选模板
  - 确保模板内容符合规范
  - 准备详细的场景说明

## 七、成本估算

| 项目     | 费用    | 说明           |
| ------ | ----- | ------------ |
| 微信云开发  | 免费额度内 | 按实际使用量计费     |
| 订阅消息模板 | 免费    | 需申请审核        |
| 开发工时   | 5-8天  | 按Phase 1-3估算 |

## 八、总结

**推荐方案**: 采用微信订阅消息 + 云开发定时触发器方案

**核心优势**:

1. 免费使用，成本可控
2. 用户体验好，无需跳出小程序
3. 技术栈统一，便于维护
4. 可扩展性强，支持多种提醒场景

**下一步行动**:

1. 确认方案后，开始Phase 1实施
2. 同时申请订阅消息模板
3. 准备测试账号进行开发测试

