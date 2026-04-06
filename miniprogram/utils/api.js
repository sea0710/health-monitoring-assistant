const timeout = 120000

const callFunction = (name, data, customTimeout = timeout) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: name,
      data: data,
      timeout: customTimeout,
      success: (res) => {
        if (res.result && (res.result.code === 0 || res.result.code === 200)) {
          resolve(res.result)
        } else {
          const error = res.result || { code: -1, message: '请求失败' }
          reject(error)
        }
      },
      fail: (err) => {
        console.error(`云函数调用失败 [${name}]:`, err)
        reject({ 
          code: -1, 
          message: '网络请求失败，请检查网络连接后重试',
          error: err 
        })
      }
    })
  })
}

const api = {
  auth: {
    login: (data) => callFunction('login', data),
    register: (data) => callFunction('login', data)
  },
  
  patients: {
    get: (userId) => callFunction('report', { action: 'getPatient', userId }),
    create: (data) => callFunction('report', { action: 'createPatient', ...data }),
    update: (data) => callFunction('report', { action: 'updatePatient', ...data })
  },
  
  reports: {
    list: (patientId) => callFunction('report', { action: 'getList', patientId }),
    detail: (reportId) => callFunction('report', { action: 'getDetail', reportId }),
    create: (data) => callFunction('report', { action: 'create', ...data }),
    update: (data) => callFunction('report', { action: 'update', ...data }),
    delete: (reportId) => callFunction('report', { action: 'delete', reportId }),
    batchDetail: (reportIds) => callFunction('report', { action: 'getBatchDetails', reportIds })
  },
  
  ocr: {
    recognize: (fileID) => callFunction('ocr', { fileID }, 60000)
  },
  
  trends: {
    get: (patientId) => callFunction('report', { action: 'getTrends', patientId })
  },
  
  references: {
    get: () => {
      return Promise.resolve({
        code: 0,
        data: {
          WBC: { min: 3.5, max: 9.5, unit: '×10^9/L' },
          NEUT: { min: 1.8, max: 6.3, unit: '×10^9/L' },
          NEUT_PERCENT: { min: 40, max: 75, unit: '%' },
          LYMPH: { min: 1.1, max: 3.2, unit: '×10^9/L' },
          LYMPH_PERCENT: { min: 20, max: 50, unit: '%' },
          MONO: { min: 0.1, max: 0.6, unit: '×10^9/L' },
          MONO_PERCENT: { min: 3, max: 10, unit: '%' },
          EOS: { min: 0.02, max: 0.52, unit: '×10^9/L' },
          EOS_PERCENT: { min: 0.4, max: 8, unit: '%' },
          BASO: { min: 0, max: 0.06, unit: '×10^9/L' },
          BASO_PERCENT: { min: 0, max: 1, unit: '%' },
          RBC: { min: 4.3, max: 5.8, unit: '×10^12/L' },
          HGB: { min: 130, max: 175, unit: 'g/L' },
          HCT: { min: 40, max: 50, unit: '%' },
          MCV: { min: 82, max: 100, unit: 'fL' },
          MCH: { min: 27, max: 34, unit: 'pg' },
          MCHC: { min: 316, max: 354, unit: 'g/L' },
          RDW_SD: { min: 37, max: 51, unit: 'fL' },
          RDW_CV: { min: 11.9, max: 14.5, unit: '%' },
          PLT: { min: 125, max: 350, unit: '×10^9/L' },
          PDW: { min: 15, max: 17, unit: '%' },
          MPV: { min: 9, max: 17, unit: 'fL' },
          P_LCR: { min: 13, max: 43, unit: '%' },
          TCT: { min: 0.1, max: 0.3, unit: '%' },
          CRP: { min: 0, max: 10, unit: 'mg/L' }
        }
      })
    }
  },
  
  reminders: {
    list: (patientId) => callFunction('report', { action: 'getReminders', patientId }),
    create: (data) => callFunction('report', { action: 'createReminder', ...data }),
    add: (data) => callFunction('report', { action: 'addReminder', ...data }),
    update: (data) => callFunction('report', { action: 'updateReminder', ...data }),
    delete: (reminderId) => callFunction('report', { action: 'deleteReminder', reminderId })
  },
  
  message: {
    send: (data) => callFunction('sendMessage', data)
  }
}

module.exports = { api }
