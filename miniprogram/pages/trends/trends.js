const { api } = require('../../utils/api')
const { showLoading, hideLoading } = require('../../utils/util')
const { INDICATORS } = require('../../utils/constants')
import * as echarts from '../../components/ec-canvas/echarts'

let chart = null

function initChart(canvas, width, height, dpr, data, indicatorName) {
  chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: dpr
  })
  canvas.setChart(chart)

  const option = {
    grid: {
      top: 20,
      right: 20,
      bottom: 40,
      left: 50
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.substring(5)),
      axisLine: {
        lineStyle: { color: '#e5e7eb' }
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 10
      },
      splitLine: {
        lineStyle: { color: '#f3f4f6' }
      }
    },
    series: [{
      name: indicatorName,
      type: 'line',
      data: data.map(d => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        color: '#14b8a6',
        width: 2
      },
      itemStyle: {
        color: '#14b8a6'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(20, 184, 166, 0.3)'
          }, {
            offset: 1, color: 'rgba(20, 184, 166, 0.05)'
          }]
        }
      }
    }]
  }

  chart.setOption(option)
  return chart
}

Page({
  data: {
    patientId: '',
    currentIndicator: 'WBC',
    currentIndicatorName: '白细胞计数',
    indicatorOptions: INDICATORS,
    trendData: [],
    ec: {
      onInit: null
    }
  },

  onLoad(options) {
    if (options.patientId) {
      this.setData({ patientId: options.patientId })
      this.loadTrendData()
    }
  },

  async loadTrendData() {
    showLoading('加载中...')
    
    try {
      const res = await api.trends.get(this.data.patientId)
      
      if (res.code === 0) {
        this.setData({ trendData: res.data || [] })
        this.initChart()
      }
    } catch (error) {
      console.error('加载趋势数据失败:', error)
    } finally {
      hideLoading()
    }
  },

  initChart() {
    const { trendData, currentIndicator, currentIndicatorName } = this.data
    
    const chartData = trendData
      .filter(d => d[currentIndicator] !== undefined && d[currentIndicator] !== null)
      .map(d => ({
        date: d.date,
        value: d[currentIndicator]
      }))
    
    if (chartData.length === 0) return

    this.setData({
      ec: {
        onInit: (canvas, width, height, dpr) => {
          return initChart(canvas, width, height, dpr, chartData, currentIndicatorName)
        }
      }
    })
  },

  handleBack() {
    wx.navigateBack()
  },

  handleIndicatorChange(e) {
    const code = e.currentTarget.dataset.code
    const indicator = INDICATORS.find(i => i.code === code)
    
    this.setData({
      currentIndicator: code,
      currentIndicatorName: indicator ? indicator.name : code
    })
    
    this.initChart()
  }
})
