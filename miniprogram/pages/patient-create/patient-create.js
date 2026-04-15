const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

Page({
  data: {
    name: '',
    gender: '',
    isEditMode: false,
    isLoading: false
  },

  onLoad(options) {
    if (options.edit === 'true') {
      this.setData({ isEditMode: true })
      this.loadPatientData()
    }
  },

  loadPatientData() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')

    if (patient) {
      this.setData({
        name: patient.name || '',
        gender: patient.gender || ''
      })
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onGenderSelect(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({ gender })
  },

  async handleSave() {
    const { name, gender } = this.data

    if (!name.trim()) {
      showToast('请输入患者姓名')
      return
    }

    if (!gender) {
      showToast('请选择性别')
      return
    }

    this.setData({ isLoading: true })
    showLoading('保存中...')

    try {
      const app = getApp()
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
      const userId = userInfo?._id || userInfo?.user_id

      if (!userId) {
        hideLoading()
        this.setData({ isLoading: false })
        showToast('用户信息异常，请重新登录')
        setTimeout(() => { app.clearUserInfo(); wx.switchTab({ url: '/pages/home/home' }) }, 1500)
        return
      }

      let res
      if (this.data.isEditMode) {
        let patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')
        let patientId = patient?._id || patient?.patient_id

        if (!patientId) {
          const reloadUserId = userInfo?._id || userInfo?.user_id
          try {
            const reloadRes = await api.patients.get(reloadUserId)

            if (reloadRes.data && reloadRes.data._id) {
              patient = reloadRes.data
              patientId = patient._id
              app.setPatientInfo(patient)
            } else {
              console.error('6. 重新加载失败 - 无有效数据')
              hideLoading()
              this.setData({ isLoading: false })
              showToast('患者数据异常，请删除后重新创建')
              return
            }
          } catch (e) {
            console.error('7. 重新加载异常:', e)
            hideLoading()
            this.setData({ isLoading: false })
            showToast('加载患者数据失败，请重试')
            return
          }
        }

        res = await api.patients.update({
          patient_id: patientId,
          name: name.trim(),
          gender
        })

        if (res.code === 404) {
          this.setData({ isEditMode: false })
          res = await api.patients.create({
            user_id: userId,
            name: name.trim(),
            gender
          })
          
          if (res.code === 0 && res.data) {
            app.setPatientInfo(res.data)
          }
        } else if (res.code === 0) {
          app.setPatientInfo({ ...patient, name: name.trim(), gender })
        }
      } else {
        res = await api.patients.create({
          user_id: userId,
          name: name.trim(),
          gender
        })

        if (res.code === 0 && res.data) {
          if (res.data.name) {
            app.setPatientInfo(res.data)
          } else {
            await app.loadPatientInfo(userId)
          }
        } else if (res.code === 0) {
          await app.loadPatientInfo(userId)
        } else {
          console.error('创建失败:', res)
        }
      }

      if (res.code === 0) {
        showToast(this.data.isEditMode ? '修改成功' : '创建成功')
        setTimeout(() => {
          wx.navigateBack()
        }, 1000)
      } else {
        showToast(res.message || '操作失败')
        console.error('保存患者档案失败:', res)
      }
    } catch (error) {
      console.error('保存患者档案失败:', error)
      showToast(error.message || '操作失败，请重试')
    } finally {
      hideLoading()
      this.setData({ isLoading: false })
    }
  },

  handleDeletePatient() {
    const app = getApp()
    const patient = app.globalData.patientInfo || wx.getStorageSync('patientInfo')

    if (!patient) return

    const reportCount = app.globalData.reports?.length || 0

    wx.showModal({
      title: '删除患者档案',
      content: `确定要删除「${patient.name}」的患者档案吗？\n\n将同时删除关联的${reportCount > 0 ? reportCount + '份报告' : '所有报告'}和提醒记录，此操作不可恢复。`,
      confirmText: '确认删除',
      confirmColor: '#dc2626',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return

        try {
          showLoading('删除中...')
          const patientId = patient._id || patient.patient_id
          await api.patients.delete(patientId)

          app.setPatientInfo(null)
          app.globalData.reports = []

          hideLoading()
          showToast('患者档案已删除')
          setTimeout(() => {
            wx.navigateBack()
          }, 1000)
        } catch (error) {
          hideLoading()
          console.error('删除患者失败:', error)
          showToast(error.message || '删除失败，请重试')
        }
      }
    })
  }
})
