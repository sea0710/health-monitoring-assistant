const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { INDICATORS } = require('../../utils/constants')
const echarts = require('../../components/ec-canvas/echarts')

let chart = null

// 根据指标值计算异常等级
function calculateLevel(code, value) {
  if (code === 'WBC') {
    if (value >= 3.5) return 'normal'
    if (value >= 3.0) return 'warning'
    if (value >= 2.0) return 'danger2'
    if (value >= 1.0) return 'danger3'
    return 'critical'
  } else if (code === 'NEUT#') {
    if (value >= 1.8) return 'normal'
    if (value >= 1.5) return 'warning'
    if (value >= 1.0) return 'danger2'
    if (value >= 0.5) return 'danger3'
    return 'critical'
  } else if (code === 'PLT') {
    if (value >= 125) return 'normal'
    if (value >= 100) return 'warning'
    if (value >= 50) return 'danger2'
    if (value >= 25) return 'danger3'
    return 'critical'
  } else if (code === 'HGB') {
    if (value >= 130) return 'normal'
    if (value >= 95) return 'warning'
    if (value >= 80) return 'danger2'
    if (value >= 65) return 'danger3'
    return 'critical'
  } else if (code === 'NEUT%') {
    if (value >= 40 && value <= 75) return 'normal'
    return 'warning'
  } else if (code === 'RBC') {
    if (value >= 4.3 && value <= 5.8) return 'normal'
    return 'warning'
  }
  return 'normal'
}

// 获取等级文本
function getLevelText(level) {
  const levelTextMap = {
    'normal': '正常',
    'warning': 'Ⅰ度',
    'danger2': 'Ⅱ度',
    'danger3': 'Ⅲ度',
    'critical': 'Ⅳ度'
  }
  return levelTextMap[level] || '正常'
}

function initChart(canvas, width, height, dpr, chartData, indicatorName, referenceMin, referenceMax) {
  const chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: dpr
  })

  const option = {
    grid: {
      top: 30,
      right: 20,
      bottom: 50,
      left: 35
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.date.substring(5)),
      axisLine: {
        lineStyle: { color: '#e5e7eb' }
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 10,
        rotate: 30
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
      data: chartData.map(d => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: {
        color: '#14b8a6',
        width: 3
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

  if (referenceMin && referenceMax) {
    option.series[0].markLine = {
      silent: true,
      lineStyle: {
        color: '#9ca3af',
        type: 'dashed'
      },
      data: [
        { yAxis: referenceMin, label: { position: 'end', formatter: '下限' } },
        { yAxis: referenceMax, label: { position: 'end', formatter: '上限' } }
      ]
    }
  }

  chart.setOption(option)
  return chart
}

Page({
  data: {
    patientId: '',
    currentIndicator: 'WBC',
    currentIndicatorName: '白细胞计数',
    indicatorOptions: [],
    trendData: {},
    chartData: [],
    ec: {
      onInit: null
    },
    referenceMin: null,
    referenceMax: null
  },

  onLoad(options) {
    const indicatorOptions = INDICATORS.filter(i => ['WBC', 'NEUT#', 'HGB', 'PLT'].includes(i.code))
    this.setData({ indicatorOptions })
    
    this.initPatientId(options)
  },

  onShow() {
    if (this.data.patientId) {
      this.loadTrendData()
    } else {
      this.initPatientId({})
    }
  },

  initPatientId(options) {
    if (options.patientId) {
      this.setData({ patientId: options.patientId })
      this.loadTrendData()
      return
    }
    
    const app = getApp()
    const globalPatient = app.globalData?.patientInfo
    const storagePatient = wx.getStorageSync('patientInfo')
    
    const patient = globalPatient || storagePatient
    const patientId = patient && (patient.patient_id || patient._id)
    if (patientId) {
      this.setData({ patientId: patientId })
      this.loadTrendData()
    } else {
      hideLoading()
    }
  },

  async loadTrendData() {
    if (!this.data.patientId) {
      showToast('请先创建患者档案')
      return
    }
    
    showLoading('加载中...')
    
    try {
      const res = await api.trends.get(this.data.patientId)
      
      if (res.code === 0) {
        const trendData = res.data || {}
        this.setData({ trendData })
        this.updateChart()
      } else {
        showToast(res.message || '加载失败')
      }
    } catch (error) {
      showToast('加载失败')
    } finally {
      hideLoading()
    }
  },

  updateChart() {
    const { trendData, currentIndicator, currentIndicatorName, indicatorOptions } = this.data
    
    const indicatorTrend = trendData[currentIndicator] || []
    
    if (indicatorTrend.length === 0) {
      this.setData({ 
        chartData: [],
        ec: { onInit: null }
      })
      return
    }

    const chartData = indicatorTrend
      .map(d => {
        const value = d.value || d.test_value || 0
        const level = calculateLevel(currentIndicator, value)
        return {
          date: d.test_time || d.date || '',
          value: value,
          level: level,
          levelText: getLevelText(level)
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)

    if (chartData.length === 0) {
      this.setData({ 
        chartData: [],
        ec: { onInit: null }
      })
      return
    }

    const indicator = indicatorOptions.find(i => i.code === currentIndicator)
    const referenceMin = indicator?.min
    const referenceMax = indicator?.max

    this.setData({
      chartData,
      referenceMin,
      referenceMax,
      ec: {
        onInit: null
      }
    })

    setTimeout(() => {
      this.setData({
        ec: {
          onInit: (canvas, width, height, dpr) => {
            return initChart(canvas, width, height, dpr, chartData, currentIndicatorName, referenceMin, referenceMax)
          }
        }
      })
      
      setTimeout(() => {
        const ecCanvas = this.selectComponent('#mychart-dom-bar')
        if (ecCanvas && ecCanvas.triggerInit) {
          ecCanvas.triggerInit()
        }
      }, 200)
    }, 100)
  },

  handleIndicatorChange(e) {
    const code = e.currentTarget.dataset.code
    const indicator = this.data.indicatorOptions.find(i => i.code === code)
    
    this.setData({
      currentIndicator: code,
      currentIndicatorName: indicator?.name || code
    })
    
    this.updateChart()
  }
})
