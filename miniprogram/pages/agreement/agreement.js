Page({
  data: {
    activeTab: 'terms'
  },

  onLoad(options) {
    if (options && options.tab) {
      this.setData({ activeTab: options.tab })
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab !== this.data.activeTab) {
      this.setData({ activeTab: tab })
    }
  }
})