const { REFERENCE_DATA, DISCLAIMER_TEXT } = require('../../utils/constants')

Page({
  data: {
    references: [],
    currentCode: 'ANC',
    currentReference: null,
    disclaimer: DISCLAIMER_TEXT
  },

  onLoad() {
    this.loadReferences()
  },

  loadReferences() {
    const references = REFERENCE_DATA
    this.setData({ references })
    
    if (references.length > 0) {
      this.setData({
        currentCode: references[0].code,
        currentReference: references[0]
      })
    }
  },

  handleTabChange(e) {
    const code = e.currentTarget.dataset.code
    const reference = this.data.references.find(r => r.code === code)
    
    this.setData({
      currentCode: code,
      currentReference: reference
    })
  },

  handleGradeClick(e) {
    const grade = e.currentTarget.dataset.grade
    // 显示分级详情弹窗
    this.setData({
      showGradeDetail: true,
      selectedGrade: grade
    })
  },

  closeGradeDetail() {
    this.setData({
      showGradeDetail: false,
      selectedGrade: null
    })
  }
})
