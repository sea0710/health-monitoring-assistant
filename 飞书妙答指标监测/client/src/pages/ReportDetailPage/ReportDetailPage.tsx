import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon, Edit3Icon, TrendingUpIcon, ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  { indicator_id: '1', indicator_code: 'WBC', indicator_name: '白细胞计数', test_value: 3.2, reference_min: 4.0, reference_max: 10.0, unit: '10^9/L', is_abnormal: true, abnormal_level: 'warning' },
  { indicator_id: '2', indicator_code: 'NEUT#', indicator_name: '中性粒细胞绝对值', test_value: 1.5, reference_min: 2.0, reference_max: 7.0, unit: '10^9/L', is_abnormal: true, abnormal_level: 'danger' },
  { indicator_id: '3', indicator_code: 'NEUT%', indicator_name: '中性粒细胞百分比', test_value: 45.0, reference_min: 50.0, reference_max: 70.0, unit: '%', is_abnormal: true, abnormal_level: 'warning' },
  { indicator_id: '4', indicator_code: 'RBC', indicator_name: '红细胞计数', test_value: 4.5, reference_min: 4.0, reference_max: 5.5, unit: '10^12/L', is_abnormal: false, abnormal_level: 'normal' },
  { indicator_id: '5', indicator_code: 'HGB', indicator_name: '血红蛋白', test_value: 120, reference_min: 120, reference_max: 160, unit: 'g/L', is_abnormal: false, abnormal_level: 'normal' },
  { indicator_id: '6', indicator_code: 'PLT', indicator_name: '血小板计数', test_value: 180, reference_min: 100, reference_max: 300, unit: '10^9/L', is_abnormal: false, abnormal_level: 'normal' },
  { indicator_id: '7', indicator_code: 'LYM#', indicator_name: '淋巴细胞绝对值', test_value: 1.2, reference_min: 0.8, reference_max: 4.0, unit: '10^9/L', is_abnormal: false, abnormal_level: 'normal' },
  { indicator_id: '8', indicator_code: 'LYM%', indicator_name: '淋巴细胞百分比', test_value: 35, reference_min: 20, reference_max: 40, unit: '%', is_abnormal: false, abnormal_level: 'normal' },
];

const interpretationData = {
  basic: '根据本次血常规检测结果，白细胞计数（WBC）和中性粒细胞绝对值（NEUT#）略低于正常参考范围，这在肿瘤治疗期间是常见现象。中性粒细胞是免疫系统的重要组成部分，低水平可能提示骨髓抑制。',
  advice: '建议：1. 注意个人卫生，勤洗手，避免前往人群密集场所；2. 保持室内通风，避免接触感冒患者；3. 如出现发热（体温≥38℃）请立即就医；4. 建议3-5天后复查血常规。',
};

const ReportDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showAllIndicators, setShowAllIndicators] = useState(false);
  const [showInterpretation, setShowInterpretation] = useState(true);

  // 从 localStorage 获取数据（实际项目中使用）
  useEffect(() => {
    const savedReport = localStorage.getItem('__global_bcm_currentReport');
    const savedIndicators = localStorage.getItem('__global_bcm_indicators');
    // 这里可以设置实际数据
  }, []);

  const abnormalIndicators = mockIndicators.filter(item => item.is_abnormal);
  const hasAbnormal = abnormalIndicators.length > 0;

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
    if (abnormalIndicators.some(i => i.abnormal_level === 'critical')) return 'critical';
    if (abnormalIndicators.some(i => i.abnormal_level === 'danger')) return 'danger';
    if (abnormalIndicators.some(i => i.abnormal_level === 'warning')) return 'warning';
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

          {/* 卡片2：异常指标分级预警 */}
          <Card className={`rounded-2xl shadow-sm border-0 ${levelConfig[maxLevel].bgColor}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span>{levelConfig[maxLevel].icon}</span>
                  异常指标预警
                </CardTitle>
                {getLevelBadge(maxLevel)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {hasAbnormal ? (
                <div className="space-y-3">
                  {abnormalIndicators.map((item) => (
                    <div
                      key={item.indicator_id}
                      className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-xl"
                    >
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
                          'text-warning'
                        }`}>
                          {item.test_value}
                          <span className="text-xs ml-0.5">{item.unit}</span>
                        </div>
                        {getLevelBadge(item.abnormal_level)}
                      </div>
                    </div>
                  ))}
                  {/* 查看处理建议链接 */}
                  <button
                    onClick={() => navigate(`/reference?indicator=${abnormalIndicators[0]?.indicator_code}`)}
                    className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLinkIcon className="w-3 h-3" />
                    查看处理建议
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">✓</div>
                  <div className="text-sm text-muted-foreground">所有指标均在正常范围内</div>
                </div>
              )}

              {/* 异常等级图例 */}
              <div className="mt-4 pt-3 border-t border-border/50">
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

          {/* 卡片3：肿瘤场景专属解读 */}
          <Card className="rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-3">
              <button
                onClick={() => setShowInterpretation(!showInterpretation)}
                className="w-full flex items-center justify-between"
              >
                <CardTitle className="text-base font-semibold">肿瘤场景专属解读</CardTitle>
                {showInterpretation ? (
                  <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {showInterpretation && (
              <CardContent className="pt-0 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">基础解读</h4>
                  <p className="text-sm text-foreground leading-relaxed">{interpretationData.basic}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">居家监测建议</h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{interpretationData.advice}</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 卡片4：完整指标列表 */}
          <Card className="rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-3">
              <button
                onClick={() => setShowAllIndicators(!showAllIndicators)}
                className="w-full flex items-center justify-between"
              >
                <CardTitle className="text-base font-semibold">完整指标列表</CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{showAllIndicators ? '收起' : '展开'}</span>
                  {showAllIndicators ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </div>
              </button>
            </CardHeader>
            {showAllIndicators && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-2">
                  {mockIndicators.map((item) => (
                    <div
                      key={item.indicator_id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        item.is_abnormal ? 'bg-critical/5' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.indicator_name}</span>
                        <span className="text-xs text-muted-foreground">({item.indicator_code})</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-mono font-semibold ${
                          item.is_abnormal ? 'text-critical' : 'text-foreground'
                        }`}>
                          {item.test_value}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
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
