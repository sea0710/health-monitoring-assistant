import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, InfoIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// 指标定义
const INDICATORS = [
  { code: 'WBC', name: '白细胞计数', shortName: '白细胞', unit: '×10⁹/L', min: 4.0, max: 10.0 },
  { code: 'NEUT#', name: '中性粒细胞绝对值', shortName: '中性粒细胞', unit: '×10⁹/L', min: 2.0, max: 7.5 },
  { code: 'NEUT%', name: '中性粒细胞百分比', shortName: '中性粒细胞%', unit: '%', min: 40, max: 75 },
  { code: 'RBC', name: '红细胞计数', shortName: '红细胞', unit: '×10¹²/L', min: 3.5, max: 5.5 },
  { code: 'HGB', name: '血红蛋白', shortName: '血红蛋白', unit: 'g/L', min: 110, max: 160 },
  { code: 'PLT', name: '血小板计数', shortName: '血小板', unit: '×10⁹/L', min: 100, max: 300 },
];

// 模拟趋势数据
const mockTrendData = [
  { date: '2024-01-15', WBC: 5.2, 'NEUT#': 3.1, 'NEUT%': 58, RBC: 4.2, HGB: 125, PLT: 220 },
  { date: '2024-02-01', WBC: 3.8, 'NEUT#': 1.8, 'NEUT%': 48, RBC: 3.9, HGB: 108, PLT: 185 },
  { date: '2024-02-20', WBC: 2.5, 'NEUT#': 1.2, 'NEUT%': 42, RBC: 3.6, HGB: 95, PLT: 150 },
  { date: '2024-03-10', WBC: 4.5, 'NEUT#': 2.8, 'NEUT%': 62, RBC: 4.0, HGB: 118, PLT: 195 },
  { date: '2024-03-28', WBC: 6.2, 'NEUT#': 3.8, 'NEUT%': 65, RBC: 4.3, HGB: 132, PLT: 245 },
  { date: '2024-04-15', WBC: 7.8, 'NEUT#': 4.5, 'NEUT%': 72, RBC: 4.5, HGB: 138, PLT: 280 },
];

interface IIndicatorData {
  date: string;
  [key: string]: number | string;
}

interface TrendsPageProps {}

const TrendsPage: React.FC<TrendsPageProps> = () => {
  const navigate = useNavigate();
  const [activeIndicator, setActiveIndicator] = useState('WBC');
  const [selectedPoint, setSelectedPoint] = useState<IIndicatorData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentIndicator = useMemo(() => {
    return INDICATORS.find(i => i.code === activeIndicator) || INDICATORS[0];
  }, [activeIndicator]);

  // 计算统计数据
  const stats = useMemo(() => {
    const values = mockTrendData.map(d => d[activeIndicator] as number);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const maxIndex = values.indexOf(max);
    const minIndex = values.indexOf(min);
    
    // 找出首次异常节点
    let firstAbnormalIndex = -1;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v < currentIndicator.min || v > currentIndicator.max) {
        firstAbnormalIndex = i;
        break;
      }
    }
    
    return { max, min, maxIndex, minIndex, firstAbnormalIndex };
  }, [activeIndicator, currentIndicator]);

  // 构建ECharts配置
  const chartOption: EChartsOption = useMemo(() => {
    const data = mockTrendData.map(d => ({
      date: d.date,
      value: d[activeIndicator] as number,
    }));

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          const p = params[0];
          const date = p.name;
          const value = p.value;
          const isAbnormal = value < currentIndicator.min || value > currentIndicator.max;
          return `
            <div style="padding: 4px 8px;">
              <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">${date}</div>
              <div style="font-size: 14px; font-weight: 600;">
                ${currentIndicator.name}: <span style="color: ${isAbnormal ? '#ef4444' : '#22c55e'}">${value}</span> ${currentIndicator.unit}
              </div>
              <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">参考: ${currentIndicator.min}-${currentIndicator.max}</div>
            </div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.date.slice(5)), // 只显示月-日
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          data: data.map(d => d.value),
          smooth: true,
          symbol: 'circle',
          symbolSize: 10,
          lineStyle: {
            color: '#14b8a6',
            width: 3,
          },
          itemStyle: {
            color: (params: any) => {
              const v = params.value;
              if (v < currentIndicator.min || v > currentIndicator.max) {
                return v < currentIndicator.min * 0.5 || v > currentIndicator.max * 1.5 ? '#ef4444' : '#f97316';
              }
              return '#14b8a6';
            },
            borderWidth: 2,
            borderColor: '#fff',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(20, 184, 166, 0.3)' },
                { offset: 1, color: 'rgba(20, 184, 166, 0.05)' },
              ],
            } as any,
          },
          markArea: {
            silent: true,
            data: [
              [
                {
                  yAxis: currentIndicator.max,
                  itemStyle: { color: 'rgba(156, 163, 175, 0.1)' },
                },
                {
                  yAxis: currentIndicator.min,
                },
              ],
            ],
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 40,
            label: {
              show: true,
              formatter: '{b}',
              fontSize: 10,
              color: '#fff',
            },
            data: [
              ...(stats.maxIndex >= 0 ? [{
                name: '最高',
                coord: [stats.maxIndex, stats.max],
                itemStyle: { color: '#14b8a6' },
              }] : []),
              ...(stats.minIndex >= 0 ? [{
                name: '最低',
                coord: [stats.minIndex, stats.min],
                itemStyle: { color: '#6b7280' },
              }] : []),
              ...(stats.firstAbnormalIndex >= 0 ? [{
                name: '首次异常',
                coord: [stats.firstAbnormalIndex, mockTrendData[stats.firstAbnormalIndex][activeIndicator] as number],
                itemStyle: { color: '#f97316' },
              }] : []),
            ],
          },
        },
      ],
    };
  }, [activeIndicator, currentIndicator, stats]);

  const handleChartClick = (params: any) => {
    const index = params.dataIndex;
    if (index >= 0 && index < mockTrendData.length) {
      setSelectedPoint(mockTrendData[index]);
      setIsDialogOpen(true);
    }
  };

  const onEvents = {
    click: handleChartClick,
  };

  return (
    <>
      <style jsx>{`
        .trends-page {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .indicator-tab {
          transition: all 0.2s ease;
        }
        .indicator-tab.active {
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
      `}</style>

      <div className="trends-page w-full space-y-4 pb-20">
        {/* 指标切换栏 */}
        <section className="w-full px-4">
          <div className="bg-accent/30 rounded-xl p-1.5 flex flex-wrap gap-1">
            {INDICATORS.map(indicator => (
              <button
                key={indicator.code}
                onClick={() => setActiveIndicator(indicator.code)}
                className={`indicator-tab flex-1 min-w-[60px] py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  activeIndicator === indicator.code
                    ? 'active text-primary bg-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {indicator.shortName}
              </button>
            ))}
          </div>
        </section>

        {/* 趋势图区域 */}
        <section className="w-full px-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {currentIndicator.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    参考范围: {currentIndicator.min}-{currentIndicator.max} {currentIndicator.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <InfoIcon className="w-4 h-4" />
                  <span>点击数据点查看详情</span>
                </div>
              </div>
              
              <div className="w-full h-[320px]">
                <ReactECharts
                  option={chartOption}
                  theme="ud"
                  className="h-full w-full"
                  onEvents={onEvents}
                />
              </div>

              {/* 图例说明 */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#14b8a6]"></span>
                  <span>正常值</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#f97316]"></span>
                  <span>轻度异常</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
                  <span>重度异常</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-8 h-4 rounded bg-gray-200/50"></span>
                  <span>参考区间</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 统计摘要 */}
        <section className="w-full px-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">最高值</p>
                <p className="text-lg font-bold font-mono text-foreground">{stats.max}</p>
                <p className="text-xs text-muted-foreground">{currentIndicator.unit}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">最低值</p>
                <p className="text-lg font-bold font-mono text-foreground">{stats.min}</p>
                <p className="text-xs text-muted-foreground">{currentIndicator.unit}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">最新值</p>
                <p className="text-lg font-bold font-mono text-foreground">
                  {mockTrendData[mockTrendData.length - 1][activeIndicator] as number}
                </p>
                <p className="text-xs text-muted-foreground">{currentIndicator.unit}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 数据点详情弹窗 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg">检测详情</DialogTitle>
            </DialogHeader>
            {selectedPoint && (
              <div className="space-y-3 pt-2">
                <div className="text-sm text-muted-foreground">
                  检测时间: <span className="font-medium text-foreground">{selectedPoint.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {INDICATORS.map(indicator => {
                    const value = selectedPoint![indicator.code] as number;
                    const isAbnormal = value < indicator.min || value > indicator.max;
                    return (
                      <div
                        key={indicator.code}
                        className={`p-2 rounded-lg text-xs ${
                          isAbnormal ? 'bg-orange-50' : 'bg-gray-50'
                        }`}
                      >
                        <p className="text-muted-foreground">{indicator.name}</p>
                        <p className={`font-mono font-semibold mt-0.5 ${
                          isAbnormal ? 'text-orange-600' : 'text-foreground'
                        }`}>
                          {value} {indicator.unit}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TrendsPage;
