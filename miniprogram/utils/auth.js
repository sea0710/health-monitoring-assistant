const checkLoginStatus = () => {
  const app = getApp()
  return app.globalData.hasLogin
}

const requireAuth = () => {
  return new Promise((resolve, reject) => {
    if (checkLoginStatus()) {
      resolve(true)
      return
    }

    wx.showModal({
      title: '需要登录',
      content: '登录后可以使用此功能保存您的数据',
      confirmText: '去登录',
      confirmColor: '#14b8a6',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/home/home' })
          reject(new Error('NOT_LOGGED_IN'))
        } else {
          reject(new Error('USER_CANCELLED'))
        }
      }
    })
  })
}

const waitForLogin = (maxWait = 3000) => {
  return new Promise((resolve) => {
    const app = getApp()
    if (app.globalData.hasLogin) {
      resolve(true)
      return
    }

    let elapsed = 0
    const interval = 200
    const timer = setInterval(() => {
      elapsed += interval
      if (app.globalData.hasLogin || elapsed >= maxWait) {
        clearInterval(timer)
        resolve(app.globalData.hasLogin)
      }
    }, interval)
  })
}

module.exports = { checkLoginStatus, requireAuth, waitForLogin }
