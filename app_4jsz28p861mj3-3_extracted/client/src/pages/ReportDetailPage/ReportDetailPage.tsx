import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon, Edit3Icon, TrendingUpIcon, ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// 类型定义
interface IIndicator {
  indicator_id: string;
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
  patient_name: string;
}

// Mock 数据
const mockReport: IReport = {
  report_id: 'report_001',
  patient_id: 'patient_001',
  report_type: '血常规',
  test_time: '2024-03-20',
  test_hospital: '北京协和医院',
  raw_image_url: '',
  patient_name: '张三',
};

const mockIndicators: IIndicator[] = [
  // 核心指标4项：2个异常，2个正常
  // I度异常：只有处理原则，无出院医嘱
  { indicator_id: '1', indicator_code: 'WBC', indicator_name: '白细胞计数', test_value: 3.5, reference_min: 4.0, reference_max: 10.0, unit: '10^9/L', is_abnormal: true, abnormal_level: 'warning' },
  // II-III度异常：有处理原则 + 出院医嘱
  { indicator_id: '2', indicator_code: 'NEUT#', indicator_name: '中性粒细胞绝对值', test_value: 0.7, reference_min: 2.0, reference_max: 7.0, unit: '10^9/L', is_abnormal: true, abnormal_level: 'danger' },
  // 正常
  { indicator_id: '3', indicator_code: 'HGB', indicator_name: '血红蛋白', test_value: 130, reference_min: 120, reference_max: 160, unit: 'g/L', is_abnormal: false, abnormal_level: 'normal' },
  // 正常
  { indicator_id: '4', indicator_code: 'PLT', indicator_name: '血小板计数', test_value: 200, reference_min: 100, reference_max: 300, unit: '10^9/L', is_abnormal: false, abnormal_level: 'normal' },
  // 非核心指标
  { indicator_id: '5', indicator_code: 'RBC', indicator_name: '红细胞计数', test_value: 4.5, reference_min: 4.0, reference_max: 5.5, unit: '10^12/L', is_abnormal: false, abnormal_level: 'normal' },
  { indicator_id: '6', indicator_code: 'NEUT%', indicator_name: '中性粒细胞百分比', test_value: 55, reference_min: 50.0, reference_max: 70.0, unit: '%', is_abnormal: false, abnormal_level: 'normal' },
  { indicator_id: '7', indicator_code: 'LYM#', indicator_name: '淋巴细胞绝对值', test_value: 1.2, reference_min: 0.8, reference_max: 4.0, unit: '10^9/L', is_abnormal: false, abnormal_level: 'normal' },
  { indicator_id: '8', indicator_code: 'LYM%', indicator_name: '淋巴细胞百分比', test_value: 35, reference_min: 20, reference_max: 40, unit: '%', is_abnormal: false, abnormal_level: 'normal' },
];

// 分级参考数据：处理原则及出院医嘱
interface IGradeReference {
  level: string;
  range: { min?: number; max?: number };
  principle: string;
  dischargeAdvice?: string;
}

interface IIndicatorGradeConfig {
  code: string;
  unit: string;
  grades: IGradeReference[];
}

const indicatorGradeConfig: IIndicatorGradeConfig[] = [
  {
    code: 'WBC',
    unit: '×10⁹/L',
    grades: [
      { level: 'normal', range: { min: 4.0 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 3.0, max: 3.9 }, principle: '轻度减少，观察即可，注意预防感染' },
      { level: 'danger', range: { min: 2.0, max: 2.9 }, principle: '中度减少，需对症处理，考虑使用升白药物' },
      { level: 'danger', range: { min: 1.0, max: 1.9 }, principle: '重度减少，必须使用升白针，密切监测', dischargeAdvice: '若白细胞<2.0×10⁹/L 或 中性粒细胞<1.0×10⁹/L，立即皮下注射人粒细胞刺激因子 100μg，每日一次。连续注射3天后复查血常规，持续用药直至白细胞回升至 10.0×10⁹/L 以上' },
      { level: 'critical', range: { max: 1.0 }, principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', dischargeAdvice: '若白细胞<1.0×10⁹/L (或中性粒细胞<0.5×10⁹/L)，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查' },
    ],
  },
  {
    code: 'NEUT#',
    unit: '×10⁹/L',
    grades: [
      { level: 'normal', range: { min: 1.5 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 1.0, max: 1.4 }, principle: '轻度减少，观察即可，注意感染预防' },
      { level: 'danger', range: { min: 0.5, max: 0.9 }, principle: '中度减少，需对症处理，考虑使用升白药物', dischargeAdvice: '若中性粒细胞<1.0×10⁹/L，立即皮下注射人粒细胞刺激因子 100μg，每日一次。连续注射3天后复查血常规，持续用药直至白细胞回升至 10.0×10⁹/L 以上' },
      { level: 'danger', range: { min: 0.1, max: 0.4 }, principle: '重度减少，必须使用升白针，密切监测', dischargeAdvice: '若中性粒细胞<0.5×10⁹/L，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查' },
      { level: 'critical', range: { max: 0.1 }, principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗' },
    ],
  },
  {
    code: 'PLT',
    unit: '×10⁹/L',
    grades: [
      { level: 'normal', range: { min: 100 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 75, max: 99 }, principle: '轻度减少，观察即可' },
      { level: 'danger', range: { min: 50, max: 74 }, principle: '中度减少，需对症处理，考虑使用升血小板药物' },
      { level: 'danger', range: { min: 25, max: 49 }, principle: '重度减少，必须使用升血小板药物，密切监测', dischargeAdvice: '请皮下注射血小板生成素 1ml 或 白介素-11 1.5mg，每日一次，连续3天后再次复查血常规，直到血小板上升至 70.0×10⁹/L 以上' },
      { level: 'critical', range: { max: 25 }, principle: '极重度减少，立即给予血小板输注及止血药物，预防出血', dischargeAdvice: '若血小板<20.0×10⁹/L属于血小板减少出血危象，应尽快给予血小板输注及应用止血药物治疗' },
    ],
  },
  {
    code: 'HGB',
    unit: 'g/L',
    grades: [
      { level: 'normal', range: { min: 110 }, principle: '正常范围，无需处理' },
      { level: 'warning', range: { min: 90, max: 109 }, principle: '轻度减少，观察即可，注意休息' },
      { level: 'danger', range: { min: 80, max: 99 }, principle: '中度减少，需对症处理，考虑使用升红药物', dischargeAdvice: '若血红蛋白<100g/L，除外出血等原因后，可皮下注射促红细胞生成素' },
      { level: 'danger', range: { min: 65, max: 79 }, principle: '重度减少，必须使用升红药物，密切监测' },
      { level: 'critical', range: { max: 65 }, principle: '极重度减少，立即输血治疗，预防心衰', dischargeAdvice: '若贫血严重（如Hb<60g/L）或有明显心慌、气短等症状，必要时输血治疗' },
    ],
  },
];

// 根据指标值获取对应的分级建议
const getGradeAdvice = (code: string, value: number): { principle: string; dischargeAdvice?: string } | null => {
  const config = indicatorGradeConfig.find(c => c.code === code);
  if (!config) return null;

  for (const grade of config.grades) {
    const { min, max } = grade.range;
    if (min !== undefined && max !== undefined) {
      if (value >= min && value <= max) {
        return { principle: grade.principle, dischargeAdvice: grade.dischargeAdvice };
      }
    } else if (min !== undefined && value >= min) {
      return { principle: grade.principle, dischargeAdvice: grade.dischargeAdvice };
    } else if (max !== undefined && value < max) {
      return { principle: grade.principle, dischargeAdvice: grade.dischargeAdvice };
    }
  }
  return null;
};

const ReportDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // 从 localStorage 获取数据（实际项目中使用）
  useEffect(() => {
    const savedReport = localStorage.getItem('__global_bcm_currentReport');
    const savedIndicators = localStorage.getItem('__global_bcm_indicators');
    // 这里可以设置实际数据
  }, []);

  // 4项核心指标代码
  const coreIndicatorCodes = ['WBC', 'NEUT#', 'PLT', 'HGB'];
  
  // 过滤出核心指标
  const coreIndicators = mockIndicators
    .filter(item => coreIndicatorCodes.includes(item.indicator_code))
    .sort((a, b) => coreIndicatorCodes.indexOf(a.indicator_code) - coreIndicatorCodes.indexOf(b.indicator_code));
  
  const coreAbnormalIndicators = coreIndicators.filter(item => item.is_abnormal);
  const hasAbnormal = coreAbnormalIndicators.length > 0;

  // 异常等级标签
  const getLevelBadge = (level: string) => {
    const config: Record<string, { label: string; className: string }> = {
      normal: { label: '正常', className: 'bg-success/10 text-success border-success/20' },
      warning: { label: 'Ⅰ度', className: 'bg-warning/10 text-warning border-warning/20' },
      danger: { label: 'Ⅱ-Ⅲ度', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
      critical: { label: 'Ⅳ度', className: 'bg-critical/10 text-critical border-critical/20' },
    };
    const cfg = config[level] || config.normal;
    return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
  };

  // 最高异常等级
  const getMaxAbnormalLevel = () => {
    if (!hasAbnormal) return 'normal';
    if (coreAbnormalIndicators.some(i => i.abnormal_level === 'critical')) return 'critical';
    if (coreAbnormalIndicators.some(i => i.abnormal_level === 'danger')) return 'danger';
    if (coreAbnormalIndicators.some(i => i.abnormal_level === 'warning')) return 'warning';
    return 'normal';
  };

  const maxLevel = getMaxAbnormalLevel();
  const levelConfig: Record<string, { title: string; bgColor: string; icon: string }> = {
    normal: { title: '指标正常', bgColor: 'bg-success/5', icon: '✓' },
    warning: { title: '轻度异常（Ⅰ度）', bgColor: 'bg-warning/5', icon: '!' },
    danger: { title: '中度异常（Ⅱ-Ⅲ度）', bgColor: 'bg-orange-500/5', icon: '!' },
    critical: { title: '重度异常（Ⅳ度）', bgColor: 'bg-critical/5', icon: '!' },
  };

  return (
    <>
      <style jsx>{`
        .report-detail-page {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bottom-action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid hsl(220 13% 90%);
          box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
          padding: 16px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          z-index: 50;
        }
      `}</style>

      <div className="report-detail-page w-full max-w-md mx-auto pb-28">
        {/* 页面头部 */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 p-2 -ml-2 rounded-full hover:bg-accent transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span className="text-sm">返回</span>
            </button>
            <h1 className="text-lg font-semibold">报告详情</h1>
            <button
              onClick={() => navigate(`/report/${id}/edit`)}
              className="flex items-center gap-1 p-2 -mr-2 rounded-full hover:bg-accent transition-colors"
            >
              <Edit3Icon className="w-4 h-4" />
              <span className="text-sm">编辑</span>
            </button>
          </div>
        </header>

        {/* 主内容区 */}
        <div className="px-4 py-6 space-y-4">
          {/* 卡片1：报告基础信息 */}
          <Card className="rounded-2xl shadow-sm border-0">
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">检测医院</span>
                  <span className="text-sm font-medium">{mockReport.test_hospital}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">检测时间</span>
                  <span className="text-sm font-medium">{mockReport.test_time}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">患者姓名</span>
                  <span className="text-sm font-medium">{mockReport.patient_name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 卡片2：指标详情（4项核心指标） */}
          <Card className={`rounded-2xl shadow-sm border-0 ${hasAbnormal ? levelConfig[maxLevel].bgColor : 'bg-success/5'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span>{hasAbnormal ? levelConfig[maxLevel].icon : '✓'}</span>
                  指标详情
                </CardTitle>
                {getLevelBadge(maxLevel)}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {coreIndicators.map((item) => {
                const advice = getGradeAdvice(item.indicator_code, item.test_value);
                return (
                  <div
                    key={item.indicator_id}
                    className={`py-3 px-3 rounded-xl space-y-2 ${
                      item.is_abnormal ? 'bg-white/60' : 'bg-white/40'
                    }`}
                  >
                    {/* 指标基本信息 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{item.indicator_name}</div>
                        <div className="text-xs text-muted-foreground">
                          参考：{item.reference_min}-{item.reference_max} {item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold font-mono ${
                          item.abnormal_level === 'critical' ? 'text-critical' :
                          item.abnormal_level === 'danger' ? 'text-orange-600' :
                          item.abnormal_level === 'warning' ? 'text-warning' :
                          'text-success'
                        }`}>
                          {item.test_value}
                          <span className="text-xs ml-0.5">{item.unit}</span>
                        </div>
                        {getLevelBadge(item.abnormal_level)}
                      </div>
                    </div>
                    {/* 处理原则和出院医嘱 - 仅异常指标显示 */}
                    {advice && item.is_abnormal && (
                      <div className="bg-accent/40 rounded-lg p-2.5 space-y-1.5">
                        <div className="text-xs text-muted-foreground">处理原则</div>
                        <div className="text-sm text-foreground">{advice.principle}</div>
                        {advice.dischargeAdvice && (
                          <>
                            <div className="text-xs text-muted-foreground mt-2 pt-1.5 border-t border-border/50">出院医嘱</div>
                            <div className="text-sm text-orange-600 leading-relaxed">{advice.dischargeAdvice}</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 查看完整分级速查链接 */}
              {hasAbnormal && (
                <button
                  onClick={() => navigate(`/reference?indicator=${coreAbnormalIndicators[0]?.indicator_code}`)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLinkIcon className="w-3 h-3" />
                  查看完整分级速查
                </button>
              )}

              {/* 异常等级图例 */}
              <div className="mt-2 pt-3 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-2">异常等级说明：</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success text-xs">正常</Badge>
                  <Badge variant="outline" className="bg-warning/10 text-warning text-xs">Ⅰ度-轻度</Badge>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 text-xs">Ⅱ-Ⅲ度-中度</Badge>
                  <Badge variant="outline" className="bg-critical/10 text-critical text-xs">Ⅳ度-重度</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 免责声明 */}
          <div className="text-xs text-muted-foreground text-center py-4 px-4 bg-muted/30 rounded-xl">
            本工具仅供内部测试与健康科普参考，不构成任何诊疗建议，不能替代执业医师的专业判断
          </div>
        </div>

        {/* 悬浮按钮：查看趋势图 */}
        <button
          onClick={() => navigate('/trends')}
          className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-50"
        >
          <TrendingUpIcon className="w-6 h-6" />
        </button>
        <div className="fixed bottom-4 right-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full z-50 shadow-sm">
          趋势
        </div>
      </div>
    </>
  );
};

export default ReportDetailPage;
