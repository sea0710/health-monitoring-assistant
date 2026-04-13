# 小程序注册登录机制优化计划（最终版 v3 - 实施就绪）

## 一、核心方案：微信静默授权 + OpenID关联

### 认证流程
```
用户打开小程序 
  → 自动调用 wx.login() 获取code 
  → 云函数换取OpenID 
  → 查找/创建用户账号 
  → 登录成功 ✅
```

### 核心优势
- **完全免费**：无任何第三方服务费用
- **零门槛**：无需输入任何信息即可登录
- **体验极佳**：自动登录，用户无感知
- **安全可靠**：基于微信生态，安全性高
- **个人主体友好**：不需要企业认证
- **提醒功能已完备**：使用微信订阅消息，基于OpenID即可

### 手机号定位（大幅降级）
由于复查提醒使用的是**微信订阅消息**（非短信），手机号绑定：
- ❌ 不用于提醒功能
- ⚠️ 仅作为可选的安全增强手段
- 🔮 预留给未来可能的跨平台通知需求

---

## 二、关键技术决策

### 用户头像昵称获取（2024年最新方案）

| 接口 | 状态 | 返回结果 |
|-----|------|---------|
| `wx.getUserProfile` | ❌ 已收回(2022.10) | 默认灰色头像+"微信用户" |
| `wx.getUserInfo` | ❌ 已废弃 | 匿名数据 |
| **头像昵称填写能力** | ✅ 官方推荐 | 用户主动选择/输入 |

**头像获取**：
```xml
<button open-type="chooseAvatar" bindchooseavatar="onChooseAvatar">
  <image src="{{avatarUrl}}" mode="aspectFill"></image>
</button>
```

**昵称获取**：
```xml
<input type="nickname" placeholder="请输入昵称" value="{{nickname}}" />
```

**基础库要求**：2.21.2+（需在app.json中声明最低版本）

### 基础库兼容性处理
```javascript
// 兼容性检查
const canUseChooseAvatar = wx.canIUse('button.open-type.chooseAvatar')
const canUseNicknameInput = wx.canIUse('input.type.nickname')

// 降级方案：低版本使用普通图片选择+文本输入
if (!canUseChooseAvatar || !canUseNicknameInput) {
  // 使用 wx.chooseImage 选择图片
  // 使用普通 input 输入昵称
}
```

---

## 三、实施计划（4个阶段）

### 阶段一：微信静默登录机制（优先级最高）
**目标**：打开即登录，无需任何操作

#### Step 1: 改造 app.js
```javascript
App({
  globalData: {
    userInfo: null,
    patientInfo: null,
    openid: null,
    hasLogin: false,        // 是否已登录
    needUserInfo: false,     // 是否需要完善用户信息
    hasUserInfo: false       // 是否已设置头像昵称
  },

  onLaunch() {
    wx.cloud.init({ env: 'cloud1-1gbuq7na412c0c74', traceUser: true })
    this.autoLogin()
  },

  async autoLogin() {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject })
      })

      const res = await wx.cloud.callFunction({
        name: 'login',
        data: { action: 'wechatLogin', code: loginRes.code }
      })

      if (res.result && res.result.code === 0) {
        const data = res.result.data
        this.globalData.userInfo = data.user
        this.globalData.openid = data.openid
        this.globalData.hasLogin = true
        this.globalData.hasUserInfo = !!(data.user.nickname && data.user.avatar_url)

        wx.setStorageSync('userInfo', data.user)
        wx.setStorageSync('openid', data.openid)

        if (!this.globalData.hasUserInfo) {
          this.globalData.needUserInfo = true
        }
      }
    } catch (error) {
      console.error('自动登录失败:', error)
      this.globalData.hasLogin = false
    }
  },
  
  getUserInfo() {
    return this.globalData.userInfo || wx.getStorageSync('userInfo')
  }
})
```

#### Step 2: 扩展 login 云函数 - wechatLogin action
```javascript
async function handleWechatLogin(event, context) {
  const openid = cloud.getWXContext().OPENID
  
  const userResult = await db.collection('users').where({ openid }).get()
  
  if (userResult.data.length === 0) {
    const createResult = await db.collection('users').add({
      data: {
        openid: openid,
        phone: '',
        password: '',
        nickname: '',
        avatar_url: '',
        security_question: '',
        security_answer: '',
        created_at: new Date(),
        updated_at: new Date(),
        last_login_time: new Date(),
        login_count: 1,
        guide_status: {}  // 引导状态追踪
      }
    })
    return { code: 0, is_new_user: true, hasUserInfo: false, user_id: createResult._id, ... }
  } else {
    const user = userResult.data[0]
    await db.collection('users').doc(user._id).update({
      data: { last_login_time: new Date(), login_count: db.command.inc(1) }
    })
    return { code: 0, is_new_user: false, hasUserInfo: !!(user.nickname && user.avatar_url), user }
  }
}
```

#### Step 3: 改造 home 页面 - 支持三种状态
- 未登录：显示引导卡片 "欢迎使用愈见"
- 已登录但未设置头像昵称：显示轻量引导卡 "完善信息，获得更好体验"
- 正常内容：患者卡片 + 报告列表

#### Step 4: 创建用户引导组件
路径：`miniprogram/components/user-guide/`
- 支持跳过操作
- 记录引导状态到Storage
- 频率控制逻辑（3天不重复提示）
- 永久跳过选项

**引导状态持久化设计**：
```javascript
// 存储结构
const guideStatus = {
  user_info_guide: {
    last_show_time: Date.now(),
    skip_count: 1,
    permanent_skip: false,
    first_shown_at: Date.now()
  },
  password_guide: {
    last_show_time: null,
    skip_count: 0,
    permanent_skip: false
  }
}
wx.setStorageSync('guide_status', guideStatus)
```

#### Step 5: 改造其他页面添加登录检查
- report-upload: 上传前检查 hasLogin
- reminder: 设置提醒前检查 hasLogin
- patient-create: 编辑前检查 hasLogin
- trends: 显示示例数据或引导登录

#### Step 6: 首次引导时机优化
- ✅ 用户首次操作后弹窗（上传报告/创建档案）
- ✅ 用户浏览超过30秒视为有效互动，可触发引导
- ✅ 首次创建患者档案成功后触发密码设置引导

---

### 阶段二：基本安全加固（必须做）
**目标**：满足未来存储敏感医疗数据的基本安全要求

#### Step 1: 安装 bcryptjs
```bash
cd cloudfunctions/login
npm install bcryptjs
```

#### Step 2: 密码加密存储
```javascript
const bcrypt = require('bcryptjs')
const SALT_ROUNDS = 10

// 加密
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

// 验证
const isValid = await bcrypt.compare(inputPassword, storedHashedPassword)
```

#### Step 3: 安全问题答案bcrypt加密存储
```javascript
// 设置时加密
const hashedAnswer = await bcrypt.hash(answer, SALT_ROUNDS)

// 验证时比对
const isCorrect = await bcrypt.compare(userAnswer, storedHashedAnswer)
```

#### Step 4: 敏感信息脱敏
- 日志中不记录明文密码和答案
- API返回的手机号脱敏：138****1234
- 错误信息不泄露内部细节

#### Step 5: 数据库权限配置
确保用户只能访问自己的数据（基于 openid 或 user_id）

---

### 阶段三：安全问题验证 + 密码管理 + 用户信息设置
**目标**：提供可选的密码保护和个性化体验

#### Step 1: 创建设置用户信息页面
路径：`miniprogram/pages/set-user-info/`

**关键实现 - 头像上传处理**：
```javascript
async onChooseAvatar(e) {
  const { avatarUrl } = e.detail  // 临时路径，需立即上传
  
  try {
    // 上传到云存储
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`,
      filePath: avatarUrl
    })
    
    // 保存云存储URL
    this.setData({ avatarUrl: uploadRes.fileID })
    
    // 获取HTTP URL用于展示（可选）
    const fileList = [uploadRes.fileID]
    const urlRes = await wx.cloud.getTempFileURL({ fileList })
    this.setData({ avatarDisplayUrl: urlRes.fileList[0].tempFileURL })
    
  } catch (error) {
    console.error('头像上传失败:', error)
    showToast('头像上传失败，请重试')
  }
}
```

**隐私说明区域**：
```xml
<view class="privacy-notice">
  <text class="notice-title">📋 隐私说明</text>
  <text class="notice-text">• 我们仅收集昵称和头像，用于界面个性化展示</text>
  <text class="notice-text">• 不会用于其他用途，您可以随时修改或删除</text>
  <text class="notice-text">• 数据保留期限：账户注销后30天内永久删除</text>
  <view class="privacy-link" bindtap="goToPrivacyPolicy">
    <text>查看完整隐私政策 ></text>
  </view>
</view>
```

#### Step 2: 创建设置密码页面
路径：`miniprogram/pages/set-password/`

**预设安全问题列表**（5个+答案提示）：
```javascript
const SECURITY_QUESTIONS = [
  { id: 1, question: '您的小学学校名称？', hint: '例如：北京市第一小学' },
  { id: 2, question: '您的宠物名字？', hint: '例如：旺财' },
  { id: 3, question: '您母亲的生日？', hint: '格式：YYYYMMDD，例如：19900101' },
  { id: 4, question: '您出生的城市？', hint: '例如：北京' },
  { id: 5, question: '您最喜欢的电影？', hint: '例如：阿甘正传' }
]
```

#### Step 3: 创建修改密码页面
路径：`miniprogram/pages/change-password/`

#### Step 4: 创建重置密码页面
路径：`miniprogram/pages/reset-password/`

#### Step 5: 云函数接口扩展

| action | 功能 | 说明 |
|--------|------|------|
| `setUserInfo` | 保存头像昵称 | 上传头像到云存储，保存fileID和昵称 |
| `setPassword` | 设置密码+安全问题 | bcrypt加密存储 |
| `changePassword` | 修改密码 | 验证原密码后更新 |
| `resetPassword` | 通过问题重置密码 | 验证问题答案后重置 |
| `deleteAccount` | 注销账户 | 删除所有关联数据 |

#### Step 6: 入口位置设计
**patient-create 页面底部**：
- 未设置用户信息 → "设置头像昵称"入口
- 未设置密码 → "建议设置登录密码"入口
- 已设置密码 → "修改密码"入口

**login 页面底部**："忘记密码？"链接

**新增：数据管理入口**：
```xml
<view class="data-management">
  <text class="section-title">数据与隐私</text>
  <button class="btn-text" bindtap="exportData">导出我的数据</button>
  <button class="btn-text danger" bindtap="deleteAccount">注销账户</button>
</view>
```

---

### 阶段四：可选手机号绑定（最低优先级，可延后）
预留方案，当前不实施。

---

## 四、用户体验设计

### 首次使用流程（新用户）
```
打开小程序 → 静默登录(500ms) → 病历夹首页
  ↓
[引导卡片] 欢迎使用愈见·血常规监测助手
  [上传报告]
  ↓
首次操作后 / 浏览超过30秒
  ↓
[弹窗] 完善个人信息，获得更好体验
  [立即设置] [稍后再说]
  ↓
稍后再说 → 记录状态，3天内不再提示
```

### 引导频率控制规则
1. 用户拒绝后记录时间戳和跳过次数
2. 同一引导3天内不再重复提示
3. 提供"永久关闭此提示"选项
4. 存储结构包含：last_show_time, skip_count, permanent_skip

### 错误恢复机制
```javascript
// 网络异常恢复后的自动重新登录
onNetworkRecover() {
  if (!this.globalData.hasLogin) {
    this.autoLogin().then(() => {
      // 刷新当前页面
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      currentPage.onLoad(currentPage.options)
      currentPage.onShow()
    })
  }
}
```

---

## 五、隐私合规性保障

### 必须包含要素
1. ✅ 明确告知：引导界面说明信息用途
2. ✅ 自愿原则：提供"跳过"/"暂不设置"选项
3. ✅ 隐私政策：引导界面显示完整隐私政策链接
4. ✅ 数据管理：UI中有明确的"导出数据"和"注销账户"入口
5. ✅ 存储安全：加密存储，访问控制
6. ✅ 数据保留期限：明确告知"账户注销后30天内永久删除"

### 信息使用范围
```
收集（必须）：
- 微信OpenID：系统唯一标识

收集（可选）：
- 用户昵称：界面个性化展示
- 用户头像：身份标识展示
- 安全问题答案：密码找回验证（bcrypt加密）

不收集：
- 用户手机号（当前阶段）
- 地理位置、通讯录等敏感信息
```

---

## 六、文件变更清单

### 新增文件（15个）
```
miniprogram/
├── utils/
│   └── auth.js                      # 认证工具函数
├── components/
│   └── user-guide/                  # 用户引导组件（4个文件）
├── pages/
│   ├── set-user-info/               # 设置用户信息（4个文件）
│   ├── set-password/                # 设置密码（4个文件）
│   ├── change-password/             # 修改密码（4个文件）
│   └── reset-password/              # 重置密码（4个文件）
cloudfunctions/login/
└── package.json                     # 添加 bcryptjs 依赖
```

### 修改文件（11个）
```
miniprogram/app.js                   # 自动登录 + 状态管理
miniprogram/app.json                # 注册新页面 + 声明基础库版本
miniprogram/pages/home/home.*        # 三种状态UI
miniprogram/pages/login/login.*      # 备用登录 + 忘记密码入口
miniprogram/pages/patient-create/*   # 密码/用户信息入口 + 数据管理
miniprogram/pages/report-upload/*    # 登录检查
miniprogram/pages/reminder/*         # 登录检查
cloudfunctions/login/index.js        # 新增多个action
```

---

## 七、实施时间估算

| 阶段 | 内容 | 工时 | 缓冲 | 合计 |
|-----|------|------|------|------|
| 阶段一 | 微信静默登录 + 引导组件 | 3-4h | 1h | 4-5h |
| 阶段二 | 安全加固（bcrypt） | 1-2h | 0.5h | 1.5-2.5h |
| 阶段三 | 密码管理 + 用户信息 + 安全问题 | 4-5h | 2h | 6-7h |
| **总计** | | **8-11h** | **3.5h** | **11.5-14.5h** |

*缓冲时间用于：头像上传调试、基础库兼容测试、边界情况处理*

---

## 八、验收标准（18条）

### 功能验收（8条）
1. ✅ 打开小程序自动登录，无需任何操作
2. ✅ 新用户自动创建账号，显示引导界面
3. ✅ 老用户直接看到自己的数据
4. ✅ 可选设置头像昵称（使用微信官方填写能力）
5. ✅ 可选设置登录密码（非强制）
6. ✅ 可通过安全问题找回密码
7. ✅ 所有密码和安全问题答案均 bcrypt 加密存储
8. ✅ 复查提醒功能不受影响（继续使用微信订阅消息）

### 体验验收（4条）
9. ✅ 新用户可跳过信息授权，正常使用核心功能
10. ✅ 用户信息授权流程符合微信规范（2024年最新）
11. ✅ 拒绝授权后3天内不再重复提示
12. ✅ 整体流程流畅自然

### 安全验收（3条）
13. ✅ 隐私政策可访问，信息使用说明清晰
14. ✅ 数据删除UI入口可用（导出/注销）
15. ✅ 所有敏感信息均加密存储

### 技术验收（3条）
16. ✅ 冷启动时间 < 2秒（95%分位）
17. ✅ 在微信基础库2.0+版本正常运行（含降级方案）
18. ✅ 网络异常恢复后能自动重新登录

---

## 九、监控指标建议

实施后持续监控以下指标：

| 指标 | 目标值 | 监控方式 |
|-----|--------|---------|
| 登录成功率 | >99% | 云函数日志 |
| 用户信息完善率 | 跟踪转化率 | 数据库统计 |
| 密码设置率 | 了解需求 | 数据库统计 |
| 登录相关错误率 | <0.1% | 错误监控 |
| 冷启动耗时P95 | <2000ms | 性能监控 |

---

## 十、风险控制

| 风险 | 应对措施 | 预案 |
|-----|---------|------|
| 头像临时路径过期 | 立即上传云存储 | 上传失败则重试，最多3次 |
| 低版本基础库 | canIUse检查 | 降级为普通选择器 |
| bcrypt云函数兼容 | 使用bcryptjs纯JS版 | 已验证兼容性 |
| 微信API变更 | 监控官方文档 | 准备降级方案 |
| 用户频繁拒绝 | 频率控制+永久跳过 | 尊重用户选择 |

---

## 下一步行动

**确认此计划后立即开始实施**：

1. **阶段一**（4-5h）：静默登录 + 用户引导组件
2. **阶段二**（1.5-2.5h）：bcrypt安装 + 安全加固
3. **阶段三**（6-7h）：密码管理 + 用户信息设置 + 安全问题
4. **集成测试**（1h）：完整流程测试 + GitHub推送

**预计总工时：11.5-14.5小时（含缓冲）**
