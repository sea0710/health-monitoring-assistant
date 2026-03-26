const { api } = require('../../utils/api')
const { showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    references: [],
    currentCode: 'WBC',
    currentReference: null
  },

  onLoad() {
    this.loadReferences()
  },

  async loadReferences() {
    showLoading('加载中...')
    
    try {
      const res = await api.references.get()
      
      if (res.code === 0) {
        const references = res.data || []
        this.setData({ references })
        
        if (references.length > 0) {
          this.setData({
            currentCode: references[0].code,
            currentReference: references[0]
          })
        }
      }
    } catch (error) {
      console.error('加载分级速查数据失败:', error)
    } finally {
      hideLoading()
    }
  },

  handleTabChange(e) {
    const code = e.currentTarget.dataset.code
    const reference = this.data.references.find(r => r.code === code)
    
    this.setData({
      currentCode: code,
      currentReference: reference
    })
  }
})
