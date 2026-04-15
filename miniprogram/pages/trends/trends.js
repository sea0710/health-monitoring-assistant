const { api } = require('../../utils/api')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { INDICATORS, calculateLevel, getLevelText, getLevelClass, CORE_INDICATOR_CODES } = require('../../utils/constants')
const echarts = require('../../components/ec-canvas/echarts')

let chart = null

// 根据异常等级获取颜色
function getLevelColor(level) {
  const levelClass = getLevelClass(level)
  const colorMap = {
    'normal': '#2eb8aa',
    'warning': '#f59e0b',
    'danger': '#f97415',
    'critical': '#dc2626'
  }
  return colorMap[levelClass] || '#2eb8aa'
}

function initChart(canvas, width, height, dpr, chartData, indicatorName, referenceMin, referenceMax) {
  const chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: dpr
  })

  // 为每个数据点设置异常颜色
  const itemColors = chartData.map(d => getLevelColor(d.level))

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
      data: chartData.map((d, idx) => ({
        value: d.value,
        itemStyle: {
          color: itemColors[idx]
        }
      })),
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
    const indicatorOptions = INDICATORS.filter(i => CORE_INDICATOR_CODES.includes(i.code))
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
    const patientId = patient && (patient._id || patient.patient_id)
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
        const { level, isAbnormal } = calculateLevel(currentIndicator, value)
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
