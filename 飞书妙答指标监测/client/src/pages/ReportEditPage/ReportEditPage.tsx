import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

// 数据接口
interface IIndicator {
  indicator_id: string;
  report_id: string;
  indicator_code: string;
  indicator_name: string;
  test_value: number;
  reference_min?: number;
  reference_max?: number;
  unit: string;
  is_abnormal: boolean;
  abnormal_level: 'normal' | 'warning' | 'danger' | 'critical';
}

interface IReport {
  report_id: string;
  patient_id: string;
  report_type: string;
  test_time: string;
  test_hospital: string;
  raw_image_url: string;
  create_time: string;
  update_time: string;
}

// 核心指标配置
const CORE_INDICATORS = [
  { code: 'WBC', name: '白细胞计数', unit: '×10⁹/L' },
  { code: 'NEUT#', name: '中性粒细胞绝对值', unit: '×10⁹/L' },
  { code: 'NEUT%', name: '中性粒细胞百分比', unit: '%' },
  { code: 'RBC', name: '红细胞计数', unit: '×10¹²/L' },
  { code: 'HGB', name: '血红蛋白', unit: 'g/L' },
  { code: 'PLT', name: '血小板计数', unit: '×10⁹/L' },
];

// 其他指标配置
const OTHER_INDICATORS = [
  { code: 'LYMPH#', name: '淋巴细胞绝对值', unit: '×10⁹/L' },
  { code: 'LYMPH%', name: '淋巴细胞百分比', unit: '%' },
  { code: 'MONO#', name: '单核细胞绝对值', unit: '×10⁹/L' },
  { code: 'MONO%', name: '单核细胞百分比', unit: '%' },
  { code: 'EO#', name: '嗜酸性粒细胞绝对值', unit: '×10⁹/L' },
  { code: 'EO%', name: '嗜酸性粒细胞百分比', unit: '%' },
  { code: 'BASO#', name: '嗜碱性粒细胞绝对值', unit: '×10⁹/L' },
  { code: 'BASO%', name: '嗜碱性粒细胞百分比', unit: '%' },
  { code: 'HCT', name: '红细胞压积', unit: '%' },
  { code: 'MCV', name: '平均红细胞体积', unit: 'fL' },
  { code: 'MCH', name: '平均红细胞血红蛋白量', unit: 'pg' },
  { code: 'MCHC', name: '平均红细胞血红蛋白浓度', unit: 'g/L' },
  { code: 'RDW-CV', name: '红细胞分布宽度CV', unit: '%' },
  { code: 'RDW-SD', name: '红细胞分布宽度SD', unit: 'fL' },
  { code: 'MPV', name: '平均血小板体积', unit: 'fL' },
  { code: 'PDW', name: '血小板分布宽度', unit: '' },
  { code: 'PCT', name: '血小板压积', unit: '%' },
];

const ReportEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [report, setReport] = useState<IReport | null>(null);
  const [indicators, setIndicators] = useState<Record<string, IIndicator>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // 表单状态
  const [hospital, setHospital] = useState('');
  const [testTime, setTestTime] = useState('');
  
  // 加载报告数据
  useEffect(() => {
    const loadReportData = () => {
      try {
        // 从 localStorage 读取当前报告
        const currentReportStr = localStorage.getItem('__global_bcm_currentReport');
        const indicatorsStr = localStorage.getItem('__global_bcm_indicators');
        
        if (!currentReportStr || !id) {
          toast.error('未找到报告数据');
          navigate('/home');
          return;
        }
        
        const currentReport: IReport = JSON.parse(currentReportStr);
        
        // 验证ID匹配
        if (currentReport.report_id !== id) {
          toast.error('报告ID不匹配');
          navigate('/home');
          return;
        }
        
        setReport(currentReport);
        setHospital(currentReport.test_hospital);
        setTestTime(currentReport.test_time);
        
        // 加载指标数据
        if (indicatorsStr) {
          const allIndicators: IIndicator[] = JSON.parse(indicatorsStr);
          const reportIndicators = allIndicators.filter(ind => ind.report_id === id);
          const indicatorMap: Record<string, IIndicator> = {};
          reportIndicators.forEach(ind => {
            indicatorMap[ind.indicator_code] = ind;
          });
          setIndicators(indicatorMap);
        }
        
        setIsLoading(false);
      } catch (error) {
        logger.error('加载报告数据失败:', error);
        toast.error('加载报告数据失败');
        navigate('/home');
      }
    };
    
    loadReportData();
  }, [id, navigate]);
  
  // 更新指标值
  const updateIndicatorValue = (code: string, value: string) => {
    setIndicators(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        indicator_code: code,
        indicator_name: [...CORE_INDICATORS, ...OTHER_INDICATORS].find(i => i.code === code)?.name || code,
        unit: [...CORE_INDICATORS, ...OTHER_INDICATORS].find(i => i.code === code)?.unit || '',
        test_value: parseFloat(value) || 0,
        is_abnormal: prev[code]?.is_abnormal || false,
        abnormal_level: prev[code]?.abnormal_level || 'normal',
      } as IIndicator
    }));
  };
  
  // 更新参考值
  const updateIndicatorReference = (code: string, min: string, max: string) => {
    setIndicators(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        indicator_code: code,
        reference_min: min ? parseFloat(min) : undefined,
        reference_max: max ? parseFloat(max) : undefined,
      } as IIndicator
    }));
  };
  
  // 检查指标是否异常
  const checkAbnormal = (code: string) => {
    const indicator = indicators[code];
    if (!indicator) return { isAbnormal: false, level: 'normal' as const };
    
    const value = indicator.test_value;
    const min = indicator.reference_min;
    const max = indicator.reference_max;
    
    if (!min || !max) return { isAbnormal: false, level: 'normal' as const };
    
    const ratio = value < min ? min / value : value / max;
    
    if (value >= min && value <= max) {
      return { isAbnormal: false, level: 'normal' as const };
    } else if (ratio <= 1.25) {
      return { isAbnormal: true, level: 'warning' as const };
    } else if (ratio <= 2) {
      return { isAbnormal: true, level: 'danger' as const };
    } else {
      return { isAbnormal: true, level: 'critical' as const };
    }
  };
  
  // 获取指标显示样式
  const getIndicatorStyle = (code: string) => {
    const { isAbnormal, level } = checkAbnormal(code);
    if (!isAbnormal) return 'text-foreground';
    switch (level) {
      case 'warning': return 'text-warning font-semibold';
      case 'danger': return 'text-destructive font-semibold';
      case 'critical': return 'text-destructive font-bold';
      default: return 'text-foreground';
    }
  };
  
  // 获取趋势标记
  const getTrendMark = (code: string) => {
    const indicator = indicators[code];
    if (!indicator?.reference_min || !indicator?.reference_max) return null;
    
    const value = indicator.test_value;
    const min = indicator.reference_min;
    const max = indicator.reference_max;
    
    if (value < min) return '↓';
    if (value > max) return '↑';
    return null;
  };
  
  // 保存修改
  const handleSave = () => {
    if (!report) return;
    
    try {
      // 更新报告信息
      const updatedReport: IReport = {
        ...report,
        test_hospital: hospital,
        test_time: testTime,
        update_time: new Date().toISOString(),
      };
      
      // 更新 localStorage
      localStorage.setItem('__global_bcm_currentReport', JSON.stringify(updatedReport));
      
      // 更新报告列表
      const reportsStr = localStorage.getItem('__global_bcm_reports');
      if (reportsStr) {
        const reports: IReport[] = JSON.parse(reportsStr);
        const updatedReports = reports.map(r => 
          r.report_id === report.report_id ? updatedReport : r
        );
        localStorage.setItem('__global_bcm_reports', JSON.stringify(updatedReports));
      }
      
      // 更新指标数据
      const indicatorsStr = localStorage.getItem('__global_bcm_indicators');
      if (indicatorsStr) {
        const allIndicators: IIndicator[] = JSON.parse(indicatorsStr);
        const updatedIndicators = allIndicators.filter(ind => ind.report_id !== report.report_id);
        
        // 添加更新后的指标
        Object.values(indicators).forEach(indicator => {
          const { isAbnormal, level } = checkAbnormal(indicator.indicator_code);
          updatedIndicators.push({
            ...indicator,
            report_id: report.report_id,
            is_abnormal: isAbnormal,
            abnormal_level: level,
          });
        });
        
        localStorage.setItem('__global_bcm_indicators', JSON.stringify(updatedIndicators));
      }
      
      toast.success('报告修改已保存');
      navigate(`/report/${report.report_id}`);
    } catch (error) {
      logger.error('保存失败:', error);
      toast.error('保存失败，请重试');
    }
  };
  
  // 取消编辑
  const handleCancel = () => {
    if (report) {
      navigate(`/report/${report.report_id}`);
    } else {
      navigate('/home');
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }
  
  return (
    <>
      <style jsx>{`
        .edit-page {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <div className="edit-page min-h-screen bg-background pb-32">
        {/* 页面头部 */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-md mx-auto h-14 flex items-center justify-between px-4">
            <button
              onClick={handleCancel}
              className="p-2 -ml-2 rounded-full hover:bg-accent flex items-center gap-1"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span className="text-sm">返回</span>
            </button>
            <h1 className="text-lg font-semibold">编辑报告</h1>
            <div className="w-16" />
          </div>
        </header>
        
        {/* 页面内容 */}
        <main className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* 基础信息卡片 */}
          <Card className="rounded-2xl shadow-sm border-border">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-base font-semibold">基础信息</h2>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">检测医院</Label>
                  <Input
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    placeholder="请输入检测医院"
                    className="h-12 rounded-xl"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm">检测时间</Label>
                  <Input
                    type="datetime-local"
                    value={testTime}
                    onChange={(e) => setTestTime(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 核心指标卡片 */}
          <Card className="rounded-2xl shadow-sm border-border border-2 border-primary/20">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-primary">核心指标</h2>
                <span className="text-xs text-muted-foreground">支持手动修改</span>
              </div>
              
              <div className="space-y-4">
                {CORE_INDICATORS.map((indicator) => {
                  const indData = indicators[indicator.code];
                  const trendMark = getTrendMark(indicator.code);
                  
                  return (
                    <div key={indicator.code} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">
                          {indicator.name}
                          <span className="text-xs text-muted-foreground ml-1">({indicator.code})</span>
                        </Label>
                        {trendMark && (
                          <span className={getIndicatorStyle(indicator.code)}>
                            {trendMark}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={indData?.test_value || ''}
                            onChange={(e) => updateIndicatorValue(indicator.code, e.target.value)}
                            placeholder="检测值"
                            className={`h-11 rounded-xl pr-12 font-mono ${getIndicatorStyle(indicator.code)}`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {indicator.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={indData?.reference_min || ''}
                            onChange={(e) => {
                              const max = indData?.reference_max?.toString() || '';
                              updateIndicatorReference(indicator.code, e.target.value, max);
                            }}
                            placeholder="下限"
                            className="h-11 rounded-xl font-mono text-center"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={indData?.reference_max || ''}
                            onChange={(e) => {
                              const min = indData?.reference_min?.toString() || '';
                              updateIndicatorReference(indicator.code, min, e.target.value);
                            }}
                            placeholder="上限"
                            className="h-11 rounded-xl font-mono text-center"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* 其他指标（折叠） */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="others" className="border-0">
              <AccordionTrigger className="bg-card rounded-2xl px-5 py-4 shadow-sm hover:no-underline">
                <span className="text-base font-semibold">其他指标</span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <Card className="rounded-2xl shadow-sm border-border">
                  <CardContent className="p-5 space-y-4">
                    {OTHER_INDICATORS.map((indicator) => {
                      const indData = indicators[indicator.code];
                      const trendMark = getTrendMark(indicator.code);
                      
                      return (
                        <div key={indicator.code} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">
                              {indicator.name}
                              <span className="text-xs text-muted-foreground ml-1">({indicator.code})</span>
                            </Label>
                            {trendMark && (
                              <span className={getIndicatorStyle(indicator.code)}>
                                {trendMark}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                value={indData?.test_value || ''}
                                onChange={(e) => updateIndicatorValue(indicator.code, e.target.value)}
                                placeholder="检测值"
                                className={`h-11 rounded-xl pr-12 font-mono ${getIndicatorStyle(indicator.code)}`}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {indicator.unit}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={indData?.reference_min || ''}
                                onChange={(e) => {
                                  const max = indData?.reference_max?.toString() || '';
                                  updateIndicatorReference(indicator.code, e.target.value, max);
                                }}
                                placeholder="下限"
                                className="h-11 rounded-xl font-mono text-center"
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={indData?.reference_max || ''}
                                onChange={(e) => {
                                  const min = indData?.reference_min?.toString() || '';
                                  updateIndicatorReference(indicator.code, min, e.target.value);
                                }}
                                placeholder="上限"
                                className="h-11 rounded-xl font-mono text-center"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </main>
        
        {/* 底部固定操作栏 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
          <div className="max-w-md mx-auto p-4 flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-12 rounded-xl"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              保存修改
            </Button>
          </div>
          <div className="h-safe" />
        </div>
      </div>
    </>
  );
};

export default ReportEditPage;
