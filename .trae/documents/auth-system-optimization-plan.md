# 小程序注册登录机制优化计划（最终版 v3 - 确认实施版）

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

* **完全免费**：无任何第三方服务费用

* **零门槛**：无需输入任何信息即可登录

* **体验极佳**：自动登录，用户无感知

* **安全可靠**：基于微信生态，安全性高

* **个人主体友好**：不需要企业认证

* **提醒功能已完备**：使用微信订阅消息，基于OpenID即可

### 手机号定位（大幅降级）

由于复查提醒使用的是**微信订阅消息**（非短信），手机号绑定：

* ❌ 不用于提醒功能

* ⚠️ 仅作为可选的安全增强手段

* 🔮 预留给未来可能的跨平台通知需求

***

## 二、关键技术决策

### 用户头像昵称获取：头像昵称填写能力（官方推荐）

⚠️ **重要**：`wx.getUserProfile` 和 `wx.getUserInfo` 已于2022年10月后收回，只能获取默认灰色头像和"微信用户"。

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

**基础库要求**：2.21.2+

### 兼容性处理

```javascript
const canUseChooseAvatar = wx.canIUse('button.open-type.chooseAvatar')
const canUseNicknameInput = wx.canIUse('input.type.nickname')

if (!canUseChooseAvatar || !canUseNicknameInput) {
  // 降级方案：使用普通图片选择和文本输入
}
```

### 头像临时路径处理

```javascript
onChooseAvatar(e) {
  const { avatarUrl } = e.detail
  // avatarUrl是临时路径，需要上传到云存储
  // 然后保存云存储URL到数据库
  this.uploadAvatar(avatarUrl)
}

async uploadAvatar(tempFilePath) {
  const cloudPath = `avatars/${this.data.userId}_${Date.now()}.jpg`
  const uploadRes = await wx.cloud.uploadFile({
    cloudPath,
    filePath: tempFilePath
  })
  // 保存 uploadRes.fileID 到数据库
  this.setData({ avatarUrl: uploadRes.fileID })
}
```

***

## 三、实施计划（4个阶段）

### 阶段一：微信静默登录机制（优先级最高，3-4小时）

#### Step 1: 改造 app.js

```javascript
App({
  globalData: {
    userInfo: null,
    patientInfo: null,
    openid: null,
    hasLogin: false,
    needUserInfo: false,
    hasUserInfo: false
  },

  onLaunch() {
    wx.cloud.init({ env: 'cloud1-1gbuq7na412c0c74', traceUser: true })
    this.autoLogin()
  },

  async autoLogin() {
    try {
      // 先从缓存读取
      const cachedUserInfo = wx.getStorageSync('userInfo')
      const cachedOpenid = wx.getStorageSync('openid')
      if (cachedUserInfo && cachedOpenid) {
        this.globalData.userInfo = cachedUserInfo
        this.globalData.openid = cachedOpenid
        this.globalData.hasLogin = true
        this.globalData.hasUserInfo = !!(cachedUserInfo.nickname && cachedUserInfo.avatar_url)
        // 后台静默刷新
        this.silentRefresh()
        return
      }

      // 完整登录流程
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
        this.globalData.hasUserInfo = data.hasUserInfo || false
        this.globalData.needUserInfo = !this.globalData.hasUserInfo

        wx.setStorageSync('userInfo', data.user)
        wx.setStorageSync('openid', data.openid)
      }
    } catch (error) {
      console.error('自动登录失败:', error)
      this.globalData.hasLogin = false
    }
  },

  silentRefresh() {
    wx.login({
      success: (loginRes) => {
        wx.cloud.callFunction({
          name: 'login',
          data: { action: 'wechatLogin', code: loginRes.code }
        }).then(res => {
          if (res.result && res.result.code === 0) {
            const data = res.result.data
            this.globalData.userInfo = data.user
            this.globalData.openid = data.openid
            this.globalData.hasUserInfo = data.hasUserInfo || false
            wx.setStorageSync('userInfo', data.user)
            wx.setStorageSync('openid', data.openid)
          }
        }).catch(() => {})
      }
    })
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
        security_question_id: 0,
        security_answer: '',
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
        last_login_time: db.serverDate(),
        login_count: 1
      }
    })

    return {
      code: 0,
      message: '注册成功',
      data: {
        user_id: createResult._id,
        openid: openid,
        is_new_user: true,
        hasUserInfo: false,
        user: {
          _id: createResult._id,
          openid: openid,
          nickname: '',
          avatar_url: ''
        }
      }
    }
  } else {
    const user = userResult.data[0]
    await db.collection('users').doc(user._id).update({
      data: {
        last_login_time: db.serverDate(),
        login_count: db.command.inc(1)
      }
    })

    return {
      code: 0,
      message: '登录成功',
      data: {
        user_id: user._id,
        openid: openid,
        is_new_user: false,
        hasUserInfo: !!(user.nickname && user.avatar_url),
        user: user
      }
    }
  }
}
```

#### Step 3: 改造 home 页面 - 支持三种状态

**home.wxml**:

```xml
<!-- 未登录引导 -->
<view class="login-guide-card" wx:if="{{!hasLogin}}">
  <view class="guide-icon">👤</view>
  <text class="guide-title">欢迎使用愈见</text>
  <text class="guide-desc">上传血常规报告，AI智能识别解读</text>
</view>

<!-- 已登录但未设置头像昵称 - 轻量引导 -->
<view class="user-guide-card" wx:if="{{hasLogin && needUserInfo && !hideGuide}}">
  <text class="guide-title">完善信息，获得更好体验</text>
  <text class="guide-subtitle">设置昵称和头像，让使用更个性化</text>
  <view class="guide-actions">
    <button class="btn-primary btn-small" bindtap="goToSetUserInfo">去设置</button>
    <text class="btn-skip" bindtap="skipGuide">暂不设置</text>
  </view>
</view>

<!-- 正常内容 -->
<block wx:if="{{hasLogin}}">
  <!-- 患者卡片、报告列表... -->
</block>
```

**home.js** - 引导状态管理：

```javascript
onLoad() {
  // 读取引导状态
  const guideStatus = wx.getStorageSync('guide_status')
  if (guideStatus && guideStatus.permanent_skip) {
    this.setData({ hideGuide: true })
  } else if (guideStatus && guideStatus.last_show_time) {
    const daysSinceLastShow = (Date.now() - guideStatus.last_show_time) / (1000 * 60 * 60 * 24)
    if (daysSinceLastShow < 3) {
      this.setData({ hideGuide: true })
    }
  }
  
  this.checkLoginAndLoadData()
},

skipGuide() {
  const guideStatus = wx.getStorageSync('guide_status') || {}
  guideStatus.last_show_time = Date.now()
  guideStatus.skip_count = (guideStatus.skip_count || 0) + 1
  // 跳过3次以上，永久关闭
  if (guideStatus.skip_count >= 3) {
    guideStatus.permanent_skip = true
  }
  wx.setStorageSync('guide_status', guideStatus)
  this.setData({ hideGuide: true })
}
```

#### Step 4: 创建用户引导组件

```
miniprogram/components/user-guide/
├── user-guide.json
├── user-guide.wxml
├── user-guide.wxss
└── user-guide.js
```

#### Step 5: 改造其他页面添加登录检查

* report-upload: 上传前检查 hasLogin

* reminder: 设置提醒前检查 hasLogin

* patient-create: 编辑前检查 hasLogin

* trends: 未登录时显示引导

***

### 阶段二：基本安全加固（1-2小时）

#### Step 1: 安装 bcryptjs

```bash
cd cloudfunctions/login
npm install bcryptjs
```

#### Step 2: 密码加密存储

```javascript
const bcrypt = require('bcryptjs')
const SALT_ROUNDS = 10

// 设置密码时加密
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

// 验证密码时比对
const isValid = await bcrypt.compare(inputPassword, storedHashedPassword)
```

#### Step 3: 安全问题答案加密

```javascript
// 设置安全问题时加密
const hashedAnswer = await bcrypt.hash(answer.toLowerCase().trim(), SALT_ROUNDS)

// 验证安全问题时比对
const isAnswerCorrect = await bcrypt.compare(userAnswer.toLowerCase().trim(), storedHashedAnswer)
```

#### Step 4: 敏感信息脱敏

* 日志中不记录明文密码和答案

* API返回的手机号脱敏：138\*\*\*\*1234

* 错误信息不泄露内部细节

#### Step 5: 数据库权限配置

确保用户只能访问自己的数据

***

### 阶段三：密码管理 + 用户信息设置 + 安全问题（4-5小时）

#### Step 1: 创建设置用户信息页面

路径：`miniprogram/pages/set-user-info/`

**set-user-info.wxml**:

```xml
<view class="container page-enter">
  <view class="header">
    <text class="title">完善个人信息</text>
    <text class="subtitle">设置昵称和头像，获得更好的使用体验</text>
  </view>

  <view class="form-section">
    <!-- 头像选择 -->
    <view class="form-item">
      <text class="form-label">头像</text>
      <button class="avatar-btn" open-type="chooseAvatar" bindchooseavatar="onChooseAvatar">
        <image src="{{avatarUrl || '/images/default-avatar.png'}}" mode="aspectFill" class="avatar-image"></image>
        <text class="avatar-hint">点击更换头像</text>
      </button>
    </view>

    <!-- 昵称输入 -->
    <view class="form-item">
      <text class="form-label">昵称</text>
      <input type="nickname" placeholder="请输入您的昵称" value="{{nickname}}" bindinput="onNicknameInput" class="nickname-input" />
    </view>
  </view>

  <view class="privacy-notice">
    <text class="notice-text">我们仅收集昵称和头像，用于界面个性化展示</text>
    <text class="notice-text">不会用于其他用途，您可以随时修改或删除</text>
  </view>

  <button class="btn-primary btn-bottom" bindtap="saveUserInfo" loading="{{isSaving}}">
    {{isSaving ? '保存中...' : '保存'}}
  </button>
</view>
```

**set-user-info.js** - 头像上传处理：

```javascript
async onChooseAvatar(e) {
  const tempFilePath = e.detail.avatarUrl
  this.setData({ tempAvatarPath: tempFilePath })
  
  // 预览临时头像
  this.setData({ avatarUrl: tempFilePath })
},

async uploadAvatar(tempFilePath) {
  const userId = this.data.userId
  const cloudPath = `avatars/${userId}_${Date.now()}.jpg`
  
  try {
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempFilePath
    })
    return uploadRes.fileID
  } catch (error) {
    console.error('头像上传失败:', error)
    throw new Error('头像上传失败，请重试')
  }
},

async saveUserInfo() {
  this.setData({ isSaving: true })
  
  try {
    let avatarFileID = this.data.avatarUrl
    
    // 如果有临时头像，先上传
    if (this.data.tempAvatarPath) {
      avatarFileID = await this.uploadAvatar(this.data.tempAvatarPath)
    }
    
    const res = await api.auth.setUserInfo({
      userId: this.data.userId,
      nickname: this.data.nickname,
      avatarUrl: avatarFileID
    })
    
    if (res.code === 0) {
      // 更新全局状态
      const app = getApp()
      app.globalData.userInfo.nickname = this.data.nickname
      app.globalData.userInfo.avatar_url = avatarFileID
      app.globalData.hasUserInfo = true
      app.globalData.needUserInfo = false
      wx.setStorageSync('userInfo', app.globalData.userInfo)
      
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  } catch (error) {
    wx.showToast({ title: error.message || '保存失败', icon: 'none' })
  } finally {
    this.setData({ isSaving: false })
  }
}
```

#### Step 2: 创建设置密码页面

路径：`miniprogram/pages/set-password/`

**预设安全问题列表**（5个，含答案提示字段）：

```javascript
const SECURITY_QUESTIONS = [
  { id: 1, question: '您的小学学校名称？', hint: '例如：北京市第一小学' },
  { id: 2, question: '您的宠物名字？', hint: '例如：旺财' },
  { id: 3, question: '您母亲的生日？', hint: '格式：YYYYMMDD，例如：19900101' },
  { id: 4, question: '您出生的城市？', hint: '例如：北京' },
  { id: 5, question: '您最喜欢的电影？', hint: '例如：阿甘正传' }
]
```

**set-password.wxml**:

```xml
<view class="container page-enter">
  <view class="header">
    <text class="title">设置登录密码</text>
    <text class="subtitle">设置密码后，可使用密码登录保护账户安全</text>
  </view>

  <view class="form-section">
    <view class="form-item">
      <text class="form-label">新密码</text>
      <input type="password" placeholder="请输入密码（至少6位）" value="{{password}}" bindinput="onPasswordInput" />
    </view>

    <view class="form-item">
      <text class="form-label">确认密码</text>
      <input type="password" placeholder="请再次输入密码" value="{{confirmPassword}}" bindinput="onConfirmPasswordInput" />
    </view>
  </view>

  <view class="security-section">
    <text class="section-title">安全问题（用于找回密码）</text>
    
    <picker mode="selector" range="{{questionTexts}}" bindchange="onQuestionChange">
      <view class="picker-field">
        {{selectedQuestionText || '请选择一个问题'}}
      </view>
    </picker>
    
    <view class="form-item" wx:if="{{selectedQuestionId}}">
      <input type="text" placeholder="{{selectedQuestionHint}}" value="{{answer}}" bindinput="onAnswerInput" />
    </view>
  </view>

  <button class="btn-primary btn-bottom" bindtap="handleSetPassword" loading="{{isSetting}}">
    {{isSetting ? '设置中...' : '确认设置'}}
  </button>
</view>
```

#### Step 3: 创建修改密码页面

路径：`miniprogram/pages/change-password/`

* 原密码 → 新密码 → 确认新密码

#### Step 4: 创建重置密码页面

路径：`miniprogram/pages/reset-password/`

* 回答安全问题 → 设置新密码

#### Step 5: 云函数接口扩展

| action           | 功能        | 说明                |
| ---------------- | --------- | ----------------- |
| `wechatLogin`    | 微信静默登录    | OpenID查找/创建用户     |
| `setUserInfo`    | 保存头像昵称    | 上传头像到云存储，保存URL和昵称 |
| `setPassword`    | 设置密码+安全问题 | bcrypt加密存储        |
| `changePassword` | 修改密码      | 验证原密码后更新          |
| `resetPassword`  | 通过问题重置密码  | 验证问题答案后重置         |
| `deleteAccount`  | 注销账户      | 删除用户所有关联数据（预留）    |

#### Step 6: 入口位置设计

**patient-create 页面底部**：

```xml
<!-- 未设置用户信息 -->
<view class="security-section" wx:if="{{!hasUserInfo}}">
  <view class="tip-row">
    <text class="tip-icon">👤</text>
    <text class="tip-text">设置头像昵称，个性化您的体验</text>
  </view>
  <button class="btn-secondary" bindtap="goToSetUserInfo">去设置</button>
</view>

<!-- 未设置密码 -->
<view class="security-section" wx:if="{{hasUserInfo && !hasPassword}}">
  <view class="tip-row">
    <text class="tip-icon">🔒</text>
    <text class="tip-text">建议设置登录密码，增强账户安全</text>
  </view>
  <button class="btn-secondary" bindtap="goToSetPassword">设置密码</button>
</view>

<!-- 已设置密码 -->
<view class="security-section" wx:if="{{hasPassword}}">
  <text class="status-text">✓ 已设置密码保护</text>
  <button class="btn-text" bindtap="goToChangePassword">修改密码</button>
</view>
```

**login 页面底部**：

```xml
<view class="login-footer">
  <text class="forgot-link" bindtap="goToResetPassword">忘记密码？</text>
</view>
```

***

### 阶段四：可选手机号绑定（最低优先级，可延后）

当前阶段不实现，预留方案文档。

***

## 四、隐私合规性保障

### 必须包含的要素

1. **明确告知**：在引导界面说明信息用途
2. **自愿原则**：提供"跳过"/"暂不设置"选项
3. **隐私说明**：在引导界面提供隐私政策链接
4. **数据管理**：提供信息删除/账号注销功能（预留接口）
5. **存储安全**：加密存储，访问控制
6. **数据保留期限**：明确告知用户数据存储期限

### 用户信息使用范围说明

```
收集信息：
- 微信OpenID：系统唯一标识（必须）
- 用户昵称：用于界面个性化展示（可选）
- 用户头像：用于身份标识展示（可选）
- 安全问题答案：用于密码找回验证（可选，加密存储）

不收集：
- 用户手机号（当前阶段）
- 用户地理位置
- 通讯录等敏感信息
```

***

## 五、文件变更清单

### 新增文件（15个）

```
miniprogram/
├── utils/
│   └── auth.js                      # 认证工具函数
├── components/
│   └── user-guide/                  # 用户引导组件（4个文件）
│       ├── user-guide.json
│       ├── user-guide.wxml
│       ├── user-guide.wxss
│       └── user-guide.js
├── pages/
│   ├── set-user-info/               # 设置用户信息（4个文件）
│   │   ├── set-user-info.json
│   │   ├── set-user-info.wxml
│   │   ├── set-user-info.wxss
│   │   └── set-user-info.js
│   ├── set-password/                # 设置密码（4个文件）
│   │   ├── set-password.json
│   │   ├── set-password.wxml
│   │   ├── set-password.wxss
│   │   └── set-password.js
│   ├── change-password/             # 修改密码（4个文件）
│   │   ├── change-password.json
│   │   ├── change-password.wxml
│   │   ├── change-password.wxss
│   │   └── change-password.js
│   └── reset-password/              # 重置密码（4个文件）
│       ├── reset-password.json
│       ├── reset-password.wxml
│       ├── reset-password.wxss
│       └── reset-password.js
cloudfunctions/
└── login/
    └── package.json                 # 添加 bcryptjs 依赖
```

### 修改文件（11个）

```
miniprogram/app.js                   # 自动登录逻辑 + 新增状态管理
miniprogram/app.json                # 注册新页面路由 + 基础库版本
miniprogram/pages/home/home.wxml     # 添加三种状态UI
miniprogram/pages/home/home.js      # 支持多状态判断 + 引导逻辑
miniprogram/pages/home/home.wxss    # 引导卡片样式
miniprogram/pages/login/login.*     # 降级为备用登录 + 忘记密码入口
miniprogram/pages/patient-create/*  # 添加密码/用户信息设置入口
miniprogram/pages/report-upload/*   # 登录状态检查
miniprogram/pages/reminder/*        # 登录状态检查
cloudfunctions/login/index.js      # 新增多个action
cloudfunctions/login/package.json  # 添加bcryptjs依赖
```

***

## 六、实施时间估算

| 阶段         | 内容                   | 工时         | 费用     |
| ---------- | -------------------- | ---------- | ------ |
| 阶段一        | 微信静默登录 + 用户引导组件      | 3-4h       | ¥0     |
| 阶段二        | 基本安全加固（bcrypt + 脱敏）  | 1-2h       | ¥0     |
| 阶段三        | 密码管理 + 用户信息设置 + 安全问题 | 4-5h       | ¥0     |
| 阶段四        | 可选手机号绑定（可延后）         | 3-4h       | ¥0     |
| **核心功能总计** | 阶段一\~三               | **8-11小时** | **¥0** |

### 实施顺序建议

1. **先完成阶段一**：验证静默登录的核心流程
2. **快速验证阶段二**：确保bcrypt在云函数环境正常工作
3. **分模块实现阶段三**：

   * 先实现用户信息设置（测试头像上传）

   * 再实现密码管理功能

   * 最后整合引导逻辑

***

## 七、验收标准

### 功能验收

1. ✅ 打开小程序自动登录，无需任何操作
2. ✅ 新用户自动创建账号，显示引导界面
3. ✅ 老用户直接看到自己的数据
4. ✅ 可选设置头像昵称（使用微信官方填写能力）
5. ✅ 可选设置登录密码（非强制）
6. ✅ 可通过安全问题找回密码
7. ✅ 所有密码和安全问题答案均 bcrypt 加密存储
8. ✅ 复查提醒功能不受影响（继续使用微信订阅消息）
9. ✅ 新用户可跳过信息授权，正常使用核心功能
10. ✅ 用户信息授权流程符合微信规范（2024年最新）

### 合规验收

1. ✅ 隐私政策可访问，信息使用说明清晰
2. ✅ 拒绝授权后3天内不再重复提示
3. ✅ 所有敏感信息均加密存储

### 性能验收

1. ✅ 冷启动时间 < 2秒（95%分位）
2. ✅ 网络异常时，降级体验可用
3. ✅ 网络异常恢复后，能自动重新登录

### 兼容性验收

1. ✅ 在微信基础库2.21.2+版本正常运行
2. ✅ 低版本基础库有降级方案（普通图片选择+文本输入）
3. ✅ 多设备登录用户信息同步正常

***

## 八、关键决策点总结

| 决策项     | 最终方案                                           | 原因                      |
| ------- | ---------------------------------------------- | ----------------------- |
| 主认证方式   | 微信 OpenID                                      | 免费、零门槛、体验好              |
| 头像昵称获取  | 头像昵称填写能力                                       | 2022年后getUserProfile已失效 |
| 手机号     | 可选绑定，当前不实现                                     | 提醒用订阅消息，无需手机号           |
| 密码      | 可选设置                                           | 默认依赖微信，增强安全可自选          |
| 安全问题    | 5个预设问题+答案提示+bcrypt加密                           | 免费且适合小规模用户              |
| 密码找回    | 安全问题验证                                         | 免费且适合小规模用户              |
| 登录时机    | 延迟到实际操作时                                       | 降低门槛，先体验再注册             |
| 安全加固顺序  | 提前到第二阶段                                        | 先保证数据安全，再扩展功能           |
| 短信服务    | 暂不接入                                           | 当前无业务需求                 |
| 引导策略    | 渐进式、可跳过、频率控制                                   | 尊重用户选择，避免打扰             |
| 引导关闭持久化 | 存储last\_show\_time/skip\_count/permanent\_skip | 避免频繁打扰                  |

***

## 九、风险控制与边界处理

| 风险        | 影响                       | 应对措施                |
| --------- | ------------------------ | ------------------- |
| 微信API变更   | getUserProfile等接口可能进一步调整 | 监控官方文档，准备降级方案       |
| 用户频繁拒绝引导  | 体验下降                     | 智能降低提示频率（3天/永久跳过）   |
| 多设备同步     | 数据一致性                    | 基于OpenID保证数据一致      |
| 冷启动时间长    | 用户等待                     | 目标控制在2秒内完成静默登录      |
| bcrypt兼容性 | 云函数环境限制                  | 使用bcryptjs纯JS实现     |
| 头像临时路径有效期 | 存储失败                     | 及时上传到云存储，失败重试       |
| 低版本基础库兼容  | 功能不可用                    | wx.canIUse检测 + 降级方案 |

***

## 十、实施后监控指标

| 指标      | 目标值  | 说明         |
| ------- | ---- | ---------- |
| 登录成功率   | >99% | 静默登录成功率    |
| 用户信息完善率 | 跟踪   | 引导转化率      |
| 密码设置率   | 跟踪   | 了解用户安全需求   |
| 错误发生率   | <1%  | 重点监控登录相关错误 |
| 冷启动时间   | <2秒  | 95%分位      |

