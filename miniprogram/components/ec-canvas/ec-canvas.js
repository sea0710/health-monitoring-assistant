const echarts = require('./echarts.js');

function createCanvasAdapter(canvas, width, height) {
  const eventListeners = {};
  
  const adapter = {
    addEventListener: function(type, listener, options) {
      if (!eventListeners[type]) {
        eventListeners[type] = [];
      }
      eventListeners[type].push(listener);
    },
    removeEventListener: function(type, listener, options) {
      if (eventListeners[type]) {
        const idx = eventListeners[type].indexOf(listener);
        if (idx >= 0) {
          eventListeners[type].splice(idx, 1);
        }
      }
    },
    dispatchEvent: function(event) {
      const type = event.type;
      if (eventListeners[type]) {
        eventListeners[type].forEach(listener => {
          listener.call(this, event);
        });
      }
    },
    getBoundingClientRect: function() {
      return {
        left: 0,
        top: 0,
        width: width,
        height: height
      };
    },
    getContext: function(type) {
      return canvas.getContext(type);
    },
    measureText: function(text) {
      return canvas.getContext('2d').measureText(text);
    },
    setAttribute: function(key, value) {},
    getAttribute: function(key) {
      return null;
    },
    style: {
      width: width + 'px',
      height: height + 'px'
    },
    clientWidth: width,
    clientHeight: height,
    nodeType: 1,
    nodeName: 'CANVAS',
    width: canvas.width,
    height: canvas.height
  };
  
  return adapter;
}

Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    },
    ec: {
      type: Object
    },
    lazyLoad: {
      type: Boolean,
      value: false
    }
  },
  data: {
    isReady: false
  },
  lifetimes: {
    attached() {
      this.setData({ isReady: true })
    },
    ready() {
      if (this.data.ec && this.data.ec.onInit) {
        if (this.data.lazyLoad) {
          this._initChart = this.init.bind(this)
        } else {
          this.init()
        }
      }
    }
  },
  methods: {
    init() {
      const canvasId = this.data.canvasId
      const query = wx.createSelectorQuery().in(this)
      
      query.select('#' + canvasId).fields({
        node: true,
        size: true
      }).exec(res => {
        if (!res || !res[0]) {
          this.triggerEvent('error', { message: '未找到canvas元素' })
          return
        }
        
        const canvas = res[0].node
        const width = res[0].width
        const height = res[0].height
        const dpr = wx.getSystemInfoSync().pixelRatio
        
        if (!canvas) {
          this.triggerEvent('error', { message: 'canvas节点未定义' })
          return
        }
        
        canvas.width = width * dpr
        canvas.height = height * dpr
        
        const adapter = createCanvasAdapter(canvas, width, height)
        
        if (typeof this.data.ec.onInit === 'function') {
          try {
            this.chart = this.data.ec.onInit(adapter, width, height, dpr)
            this.triggerEvent('ready', { chart: this.chart })
          } catch (error) {
            this.triggerEvent('error', { message: error.message })
          }
        }
      })
    },
    triggerInit() {
      if (this.data.ec && this.data.ec.onInit) {
        setTimeout(() => {
          this.init()
        }, 50)
      }
    },
    touchstart(e) {
      if (this.chart && e.touches && e.touches.length > 0) {
        const touch = e.touches[0]
        this.chart.getZr().handler.dispatch('mousedown', {
          zrX: touch.x,
          zrY: touch.y
        })
      }
    },
    touchmove(e) {
      if (this.chart && e.touches && e.touches.length > 0) {
        const touch = e.touches[0]
        this.chart.getZr().handler.dispatch('mousemove', {
          zrX: touch.x,
          zrY: touch.y
        })
      }
    },
    touchend(e) {
      if (this.chart) {
        this.chart.getZr().handler.dispatch('mouseup', {
          zrX: 0,
          zrY: 0
        })
      }
    },
    touchcancel(e) {
      if (this.chart) {
        this.chart.getZr().handler.dispatch('mouseup', {
          zrX: 0,
          zrY: 0
        })
      }
    },
    getChart() {
      return this.chart
    }
  }
})
