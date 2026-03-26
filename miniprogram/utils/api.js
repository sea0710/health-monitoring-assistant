const API_BASE_URL = getApp().globalData.apiBaseUrl

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    
    wx.request({
      url: API_BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success(res) {
        if (res.statusCode === 200) {
          if (res.data.code === 0 || res.data.code === 200) {
            resolve(res.data)
          } else if (res.data.code === 401) {
            wx.removeStorageSync('token')
            wx.reLaunch({ url: '/pages/login/login' })
            reject(res.data)
          } else {
            reject(res.data)
          }
        } else {
          reject({ code: res.statusCode, message: '网络请求失败' })
        }
      },
      fail(err) {
        reject({ code: -1, message: '网络连接失败', error: err })
      }
    })
  })
}

const api = {
  auth: {
    login: (data) => request({ url: '/auth/login', method: 'POST', data }),
    register: (data) => request({ url: '/auth/register', method: 'POST', data })
  },
  
  patients: {
    get: (userId) => request({ url: `/patients/${userId}` }),
    create: (data) => request({ url: '/patients', method: 'POST', data }),
    update: (data) => request({ url: '/patients', method: 'POST', data })
  },
  
  reports: {
    list: (patientId) => request({ url: `/reports/${patientId}` }),
    detail: (reportId) => request({ url: `/reports/detail/${reportId}` }),
    create: (data) => request({ url: '/reports', method: 'POST', data })
  },
  
  ocr: {
    recognize: (filePath) => {
      return new Promise((resolve, reject) => {
        const token = wx.getStorageSync('token')
        wx.uploadFile({
          url: API_BASE_URL + '/ocr',
          filePath: filePath,
          name: 'image',
          header: {
            'Authorization': token ? `Bearer ${token}` : ''
          },
          success(res) {
            const data = JSON.parse(res.data)
            if (data.code === 0 || data.code === 200) {
              resolve(data)
            } else {
              reject(data)
            }
          },
          fail(err) {
            reject({ code: -1, message: 'OCR识别失败', error: err })
          }
        })
      })
    }
  },
  
  trends: {
    get: (patientId) => request({ url: `/trends/${patientId}` })
  },
  
  references: {
    get: () => request({ url: '/references' })
  },
  
  reminders: {
    list: (patientId) => request({ url: `/reminders/${patientId}` }),
    create: (data) => request({ url: '/reminders', method: 'POST', data }),
    update: (data) => request({ url: '/reminders', method: 'POST', data }),
    delete: (reminderId) => request({ url: `/reminders/${reminderId}`, method: 'DELETE' })
  }
}

module.exports = { api, request }
