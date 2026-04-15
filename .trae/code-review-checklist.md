# 微信小程序代码审查清单

## 云函数修改

- [ ] 修改云函数后是否已重新上传部署？
- [ ] 云函数参数命名是否与前端一致（驼峰 vs 下划线）？
- [ ] 云函数 update 操作是否过滤了 undefined 值？
- [ ] 云函数是否返回了 `_version` 版本号？
- [ ] bcrypt.compare 前是否校验参数非空？

## 前端修改

- [ ] setData 中是否使用了 `_` 前缀属性？（会被忽略，应使用 this._xxx）
- [ ] api 调用是否通过 normalizeUserParams 转换参数？
- [ ] api 调用是否通过 filterUndefined 过滤 undefined 值？
- [ ] 自定义弹窗显示前是否调用了 wx.hideLoading()？
- [ ] 页面 onShow 中是否刷新了从其他页面返回后可能变化的数据？

## 样式修改

- [ ] 颜色是否使用 CSS 变量而非硬编码？
- [ ] 字号是否在规范层级中（12/14/16/18/20px）？
- [ ] 容器 padding 是否统一为 var(--spacing-lg)？
- [ ] 底部安全区 padding-bottom 是否统一为 120px？
- [ ] danger 级别是否使用橙色 var(--danger) 而非红色？

## 数据安全

- [ ] 云数据库 update 操作中，是否有字段可能被设为 undefined？
- [ ] 退出登录时是否正确清除了所有本地缓存？
- [ ] 重新登录时是否正确加载了云端数据？
- [ ] 头像 URL 是否同时传了 avatar_url 和 avatarUrl？
