const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

const TEMPLATE_ID = 'VWOzjsDFnzLc4va2_M-zjWSOjhlVw1E_NSo_OPT0a2M'
const FREQUENCY_OPTIONS = ['1个月', '3个月', '6个月']

Page({
  data: {
    mode: 'blood_routine',
    today: '',
    chemoEndDate: '',
    lastReviewDate: '',
    frequencyIndex: -1,
    frequencyOptions: FREQUENCY_OPTIONS,
    nextReviewPreview: '',
    pendingReminders: [],
    historyReminders: [],
    displayPendingReminders: [],
    displayHistoryReminders: [],
    showDeleteConfirm: false,
    deleteTargetId: null,
    pendingExpanded: false,
    historyExpanded: false,
    deleteFromHistory: false,
    deleteTargetStatus: 'pending',
    showAddModal: false,
    addReminderDate: '',
    addReminderTime: '09:00',
    addReminderMode: 'blood_routine',
    addModeOptions: ['血常规', '其他复查'],
    addModeIndex: 0
  },

  onLoad() {
    const today = this.formatDate(new Date())
    this.setData({
      today
    })
    this.loadPatientInfo()
  },

  onShow() {
    if (this.data.patient) {
      this.loadAndSplitReminders()
    }
  },

  loadPatientInfo() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
    if (patient) {
      this.setData({ patient })
      this.loadAndSplitReminders()
    }
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.clearUserInfo()
          wx.redirectTo({ url: '/pages/login/login' })
        }
      }
    })
  },

  handleModeChange(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  onChemoDateChange(e) {
    this.setData({ chemoEndDate: e.detail.value })
  },

  onLastReviewDateChange(e) {
    this.setData({ lastReviewDate: e.detail.value })
    this.updateNextReviewPreview()
  },

  onFrequencyChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({ frequencyIndex: index })
    this.updateNextReviewPreview()
  },

  updateNextReviewPreview() {
    const { lastReviewDate, frequencyIndex } = this.data
    if (!lastReviewDate || frequencyIndex < 0) {
      this.setData({ nextReviewPreview: '' })
      return
    }
    const base = new Date(lastReviewDate)
    base.setMonth(base.getMonth() + (frequencyIndex + 1))
    this.setData({ nextReviewPreview: this.formatDate(base) })
  },

  async handleQuickCreateBlood() {
    const { chemoEndDate, pendingReminders, historyReminders, patient, mode } = this.data
    if (!chemoEndDate) {
      showToast('请先选择化疗结束日期')
      return
    }

    const base = new Date(chemoEndDate)
    const date1 = new Date(base)
    date1.setDate(date1.getDate() + 6)
    const date2 = new Date(base)
    date2.setDate(date2.getDate() + 13)

    console.log('=== 一键设置血常规调试信息 ===')
    console.log('化疗结束日期:', chemoEndDate)
    console.log('计算出的日期1:', this.formatDate(date1), '(+6天)')
    console.log('计算出的日期2:', this.formatDate(date2), '(+13天)')
    console.log('当前时间:', new Date().toLocaleString())

    const dates = [
      { d: date1, label: '第7天复查前1天' },
      { d: date2, label: '第14天复查前1天' }
    ]

    const allDates = [...pendingReminders, ...historyReminders].map(r => r.reminder_date)
    console.log('已存在的日期:', allDates)
    
    const toAdd = dates.filter(item => !allDates.includes(this.formatDate(item.d)))
    console.log('需要添加的日期:', toAdd.map(item => this.formatDate(item.d)))

    if (toAdd.length === 0) {
      showToast('该日期的提醒已存在')
      return
    }

    try {
      showLoading('生成中...')
      const patientId = patient.patient_id || patient._id

      for (const item of toAdd) {
        const reminderData = {
          patient_id: patientId,
          reminder: {
            reminder_date: this.formatDate(item.d),
            reminder_time: '09:00',
            status: 'pending',
            source: 'auto',
            mode: 'blood_routine'
          }
        }
        console.log('准备添加提醒:', reminderData)
        
        await api.reminders.add(reminderData)
      }

      hideLoading()

      if (toAdd.length < dates.length) {
        showToast(`已生成 ${toAdd.length} 条复查建议（${dates.length - toAdd.length} 条已存在）`)
      } else {
        showToast(`已生成 ${toAdd.length} 条复查建议`)
      }

      this.loadAndSplitReminders()
    } catch (error) {
      hideLoading()
      console.error('一键生成失败:', error)
      showToast('生成失败，请重试')
    }
  },

  async handleQuickCreateOther() {
    const { lastReviewDate, frequencyIndex, pendingReminders, historyReminders, patient, mode } = this.data
    if (!lastReviewDate) {
      showToast('请先选择上次复查时间')
      return
    }
    if (frequencyIndex < 0) {
      showToast('请选择复查频率')
      return
    }

    const monthMap = [1, 3, 6]
    const months = monthMap[frequencyIndex]

    const base = new Date(lastReviewDate)
    base.setMonth(base.getMonth() + months)
    base.setDate(base.getDate() - 5)
    const targetDate = this.formatDate(base)

    const allDates = [...pendingReminders, ...historyReminders].map(r => r.reminder_date)
    if (allDates.includes(targetDate)) {
      showToast('该日期的提醒已存在')
      return
    }

    try {
      showLoading('生成中...')
      const patientId = patient.patient_id || patient._id

      await api.reminders.add({
        patient_id: patientId,
        reminder: {
          reminder_date: targetDate,
          reminder_time: '09:00',
          status: 'pending',
          source: 'auto',
          mode: 'other_review'
        }
      })

      hideLoading()
      showToast('已生成 1 条复查建议')
      this.loadAndSplitReminders()
    } catch (error) {
      hideLoading()
      console.error('一键生成失败:', error)
      showToast('生成失败，请重试')
    }
  },

  handleManualAdd() {
    const { today, mode } = this.data
    const modeIndex = mode === 'blood_routine' ? 0 : 1
    this.setData({
      showAddModal: true,
      addReminderDate: today,
      addReminderTime: '09:00',
      addReminderMode: mode,
      addModeIndex: modeIndex
    })
  },

  onAddDateChange(e) {
    this.setData({
      addReminderDate: e.detail.value
    })
  },

  onAddTimeChange(e) {
    this.setData({
      addReminderTime: e.detail.value
    })
  },

  onAddModeChange(e) {
    const index = parseInt(e.detail.value)
    const mode = index === 0 ? 'blood_routine' : 'other_review'
    this.setData({
      addModeIndex: index,
      addReminderMode: mode
    })
  },

  handleCancelAdd() {
    this.setData({
      showAddModal: false,
      addReminderDate: '',
      addReminderTime: '09:00',
      addReminderMode: 'blood_routine',
      addModeIndex: 0
    })
  },

  async handleConfirmAdd() {
    const { patient, addReminderDate, addReminderTime, addReminderMode } = this.data
    
    if (!patient) {
      showToast('请先登录或创建患者信息')
      return
    }
    
    const patientId = patient.patient_id || patient._id
    if (!patientId) {
      showToast('患者信息不完整，请重新登录')
      return
    }

    if (!addReminderDate) {
      showToast('请选择提醒日期')
      return
    }

    const itemDateTime = new Date(`${addReminderDate}T${addReminderTime}:00`)
    const now = new Date()
    if (itemDateTime <= now) {
      showToast('日期不能早于当前时间')
      return
    }
    
    try {
      showLoading('添加中...')
      
      await api.reminders.add({
        patient_id: patientId,
        reminder: {
          reminder_date: addReminderDate,
          reminder_time: addReminderTime,
          status: 'pending',
          source: 'manual',
          mode: addReminderMode
        }
      })
      
      hideLoading()
      showToast('添加成功，请保存以生效')
      this.setData({
        showAddModal: false,
        addReminderDate: '',
        addReminderTime: '09:00',
        addReminderMode: 'blood_routine',
        addModeIndex: 0
      })
      this.loadAndSplitReminders()
    } catch (error) {
      hideLoading()
      console.error('手动添加失败:', error)
      showToast('添加失败：' + (error.message || '请重试'))
    }
  },

  onItemDateChange(e) {
    const index = e.currentTarget.dataset.index
    const newVal = e.detail.value
    const key = `pendingReminders[${index}].reminder_date`
    const displayKey = `pendingReminders[${index}].reminder_date_display`
    const displayKey2 = `displayPendingReminders[${index}].reminder_date`
    const displayKey3 = `displayPendingReminders[${index}].reminder_date_display`

    this.setData({
      [key]: newVal.replace(/-/g, '/'),
      [displayKey]: newVal.replace(/-/g, '/'),
      [displayKey2]: newVal.replace(/-/g, '/'),
      [displayKey3]: newVal.replace(/-/g, '/')
    })

    const item = this.data.pendingReminders[index]
    if (item.status === 'subscribed') {
      this.downgradeToPending(index)
    }
  },

  onItemTimeChange(e) {
    const index = e.currentTarget.dataset.index
    const newVal = e.detail.value
    this.setData({
      [`pendingReminders[${index}].reminder_time`]: newVal,
      [`displayPendingReminders[${index}].reminder_time`]: newVal
    })

    const item = this.data.pendingReminders[index]
    if (item.status === 'subscribed') {
      this.downgradeToPending(index)
    }
  },

  async downgradeToPending(index) {
    const item = this.data.pendingReminders[index]
    try {
      await api.reminders.update({
        reminder_id: item.reminder_id,
        updates: {
          status: 'pending',
          is_enabled: false
        }
      })
      this.setData({
        [`pendingReminders[${index}].status`]: 'pending',
        [`pendingReminders[${index}].is_enabled`]: false,
        [`displayPendingReminders[${index}].status`]: 'pending',
        [`displayPendingReminders[${index}].is_enabled`]: false
      })
      showToast('已修改，请重新保存以生效')
    } catch (error) {
      console.error('降级状态失败:', error)
    }
  },

  async handleSaveItem(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.pendingReminders[index]
    const { reminder_date, reminder_time } = item

    if (!reminder_date) {
      showToast('请选择提醒日期')
      return
    }

    const itemDateTime = new Date(`${reminder_date.replace(/\//g, '-')}T${reminder_time}:00`)
    const now = new Date()
    if (itemDateTime <= now) {
      showToast('日期不能早于当前时间')
      return
    }

    try {
      const subscribeRes = await wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID]
      })

      if (subscribeRes[TEMPLATE_ID] !== 'accept') {
        showToast('未开启通知权限，无法保存提醒')
        return
      }

      showLoading('保存中...')

      await api.reminders.update({
        reminder_id: item.reminder_id,
        updates: {
          status: 'subscribed',
          is_enabled: true,
          reminder_date: reminder_date.replace(/\//g, '-'),
          reminder_time: reminder_time
        }
      })

      hideLoading()
      showToast('保存成功')

      this.setData({
        [`pendingReminders[${index}].status`]: 'subscribed',
        [`pendingReminders[${index}].is_enabled`]: true,
        [`displayPendingReminders[${index}].status`]: 'subscribed',
        [`displayPendingReminders[${index}].is_enabled`]: true
      })
    } catch (error) {
      hideLoading()
      console.error('保存失败:', error)
      showToast('保存失败：' + (error.message || '未知错误'))
    }
  },

  handleDeleteReminder(e) {
    const id = e.currentTarget.dataset.id
    const fromHistory = e.currentTarget.dataset.history
    const status = e.currentTarget.dataset.status
    
    if (!id) {
      showToast('删除失败：提醒ID为空')
      return
    }
    
    this.setData({
      showDeleteConfirm: true,
      deleteTargetId: id,
      deleteFromHistory: fromHistory || false,
      deleteTargetStatus: status || 'pending'
    })
  },

  handleCancelDelete() {
    this.setData({
      showDeleteConfirm: false,
      deleteTargetId: null,
      deleteFromHistory: false,
      deleteTargetStatus: 'pending'
    })
  },

  async handleConfirmDelete() {
    const id = this.data.deleteTargetId
    const status = this.data.deleteTargetStatus
    this.setData({ 
      showDeleteConfirm: false, 
      deleteTargetId: null,
      deleteTargetStatus: 'pending'
    })

    if (!id) return

    try {
      await api.reminders.delete(id)
      showToast(status === 'subscribed' ? '已取消提醒' : '删除成功')
      this.loadAndSplitReminders()
    } catch (error) {
      console.error('删除失败:', error)
      showToast('操作失败：' + (error.message || '网络错误'))
    }
  },

  async loadAndSplitReminders() {
    const { patient } = this.data
    if (!patient) return

    const patientId = patient.patient_id || patient._id
    if (!patientId) return

    try {
      const res = await api.reminders.list(patientId)
      if (res.code === 0 && res.data) {
        const all = res.data.map(item => ({
          ...item,
          reminder_date_display: item.reminder_date ? item.reminder_date.replace(/-/g, '/') : '',
          mode_text: this.getModeText(item.mode)
        }))
        const split = this.splitReminders(all)
        this.setData({
          pendingReminders: split.pending,
          historyReminders: split.history,
          displayPendingReminders: split.pending.slice(0, 5),
          displayHistoryReminders: split.history.slice(0, 5)
        })
      }
    } catch (error) {
      console.error('加载提醒列表失败:', error)
    }
  },

  splitReminders(allReminders) {
    const now = new Date()
    const todayStr = this.formatDate(now)
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const pending = []
    const history = []

    for (const r of allReminders) {
      const rDate = r.reminder_date || ''
      const rTime = r.reminder_time || '00:00'
      const isExpired = rDate < todayStr || (rDate === todayStr && rTime <= currentTime)
      isExpired ? history.push(r) : pending.push(r)
    }

    return { pending, history }
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  getModeText(mode) {
    const modeMap = {
      'blood_routine': '血常规',
      'other_review': '其他复查'
    }
    return modeMap[mode] || '未知类型'
  },

  togglePendingExpand() {
    const { pendingReminders, pendingExpanded } = this.data
    this.setData({
      pendingExpanded: !pendingExpanded,
      displayPendingReminders: !pendingExpanded ? pendingReminders : pendingReminders.slice(0, 5)
    })
  },

  toggleHistoryExpand() {
    const { historyReminders, historyExpanded } = this.data
    this.setData({
      historyExpanded: !historyExpanded,
      displayHistoryReminders: !historyExpanded ? historyReminders : historyReminders.slice(0, 5)
    })
  },

  getDisplayReminders(reminders, expanded) {
    if (expanded || reminders.length <= 5) {
      return reminders
    }
    return reminders.slice(0, 5)
  }
})
