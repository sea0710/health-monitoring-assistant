const app = getApp()

function checkLoginStatus() {
  return app.globalData.hasLogin
}

function requireAuth() {
  return new Promise((resolve, reject) => {
    if (app.globalData.hasLogin) {
      resolve(true)
      return
    }
    
    wx.showModal({
      title: '需要登录',
      content: '此功能需要登录后使用',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const pages = getCurrentPages()
          const currentPage = pages[pages.length - 1]
          wx.setStorageSync('loginCallback', '/' + currentPage.route)
          wx.navigateTo({ url: '/pages/login/login' })
          reject(new Error('NOT_LOGGED_IN'))
        } else {
          reject(new Error('USER_CANCELLED'))
        }
      }
    })
  })
}

function shouldShowGuide(guideKey) {
  const guideStatus = wx.getStorageSync('guide_status') || {}
  const guide = guideStatus[guideKey] || {}
  
  if (guide.permanent_skip) {
    return false
  }
  
  if (!guide.last_show_time) {
    return true
  }
  
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  const timeSinceLastShow = Date.now() - guide.last_show_time
  
  return timeSinceLastShow > THREE_DAYS_MS
}

function recordGuideShown(guideKey, skipped = false) {
  const guideStatus = wx.getStorageSync('guide_status') || {}
  
  if (!guideStatus[guideKey]) {
    guideStatus[guideKey] = {}
  }
  
  guideStatus[guideKey].last_show_time = Date.now()
  guideStatus[guideKey].skip_count = (guideStatus[guideKey].skip_count || 0) + (skipped ? 1 : 0)
  
  wx.setStorageSync('guide_status', guideStatus)
}

function permanentSkipGuide(guideKey) {
  const guideStatus = wx.getStorageSync('guide_status') || {}
  
  if (!guideStatus[guideKey]) {
    guideStatus[guideKey] = {}
  }
  
  guideStatus[guideKey].permanent_skip = true
  
  wx.setStorageSync('guide_status', guideStatus)
}

module.exports = {
  checkLoginStatus,
  requireAuth,
  shouldShowGuide,
  recordGuideShown,
  permanentSkipGuide
}