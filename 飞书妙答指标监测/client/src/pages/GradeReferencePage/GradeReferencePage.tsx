import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeftIcon, SearchIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// 分级速查数据
interface IGradeLevel {
  level: string;
  levelName: string;
  range: string;
  suggestion: string;
  color: string;
}

interface IIndicatorReference {
  code: string;
  name: string;
  description: string;
  careTips: string[];
  grades: IGradeLevel[];
}

const referenceData: IIndicatorReference[] = [
  {
    code: 'WBC',
    name: '白细胞计数（WBC）',
    description: '白细胞是免疫系统的重要组成部分，主要负责抵御病原体入侵。化疗期间白细胞减少（骨髓抑制）会增加感染风险。',
    careTips: [
      '保持个人卫生，勤洗手，使用肥皂或免洗洗手液',
      '避免前往人群密集场所，外出佩戴口罩',
      '保持室内通风，室温适宜',
      '避免接触感冒、发热患者',
      '注意饮食卫生，避免生冷、未煮熟的食物',
    ],
    grades: [
      { level: 'normal', levelName: '正常', range: '≥4.0×10⁹/L', suggestion: '指标正常，按常规监测', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'Ⅰ度', range: '(3.0-4.0)×10⁹/L', suggestion: '居家监测，定期复查', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'Ⅱ度', range: '(2.0-3.0)×10⁹/L', suggestion: '建议咨询医生，遵医嘱干预', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'Ⅲ度', range: '(1.0-2.0)×10⁹/L', suggestion: '及时就医，遵医嘱治疗', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'Ⅳ度', range: '<1.0×10⁹/L', suggestion: '立即就医，紧急处理', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'NEUT#',
    name: '中性粒细胞绝对值（NEUT#）',
    description: '中性粒细胞是白细胞的主要类型，负责吞噬细菌等病原体，是抵抗细菌感染的第一道防线。',
    careTips: [
      '体温监测：每日测量体温，如有发热（≥38℃）立即就医',
      '口腔护理：使用软毛牙刷，避免牙龈出血',
      '皮肤护理：保持皮肤清洁干燥，避免破损',
      '避免使用剃刀，防止皮肤划伤',
      '如有伤口，及时消毒处理',
    ],
    grades: [
      { level: 'normal', levelName: '正常', range: '≥2.0×10⁹/L', suggestion: '指标正常，按常规监测', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'Ⅰ度', range: '(1.5-2.0)×10⁹/L', suggestion: '居家监测，定期复查', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'Ⅱ度', range: '(1.0-1.5)×10⁹/L', suggestion: '建议咨询医生，遵医嘱干预', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'Ⅲ度', range: '(0.5-1.0)×10⁹/L', suggestion: '及时就医，遵医嘱治疗', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'Ⅳ度', range: '<0.5×10⁹/L', suggestion: '立即就医，紧急处理', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'HGB',
    name: '血红蛋白（HGB）',
    description: '血红蛋白负责运输氧气到全身各组织。血红蛋白降低会导致贫血，表现为乏力、头晕、气短等症状。',
    careTips: [
      '休息充足，避免剧烈运动和过度劳累',
      '起身时动作缓慢，防止体位性低血压',
      '饮食可适当增加富含铁质的食物（如红肉、菠菜等）',
      '注意保暖，避免受凉',
      '如出现心悸、气短加重，及时就医',
    ],
    grades: [
      { level: 'normal', levelName: '正常', range: '≥120g/L（男）/≥110g/L（女）', suggestion: '指标正常，按常规监测', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'Ⅰ度', range: '(100-正常值)g/L', suggestion: '居家监测，定期复查', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'Ⅱ度', range: '(80-100)g/L', suggestion: '建议咨询医生，遵医嘱干预', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'Ⅲ度', range: '(65-80)g/L', suggestion: '及时就医，遵医嘱治疗', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'Ⅳ度', range: '<65g/L', suggestion: '立即就医，紧急处理', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'PLT',
    name: '血小板计数（PLT）',
    description: '血小板主要功能是止血和凝血。血小板减少会增加出血风险，表现为皮肤瘀斑、鼻出血、牙龈出血等。',
    careTips: [
      '避免磕碰，使用软毛牙刷，避免牙龈出血',
      '避免用力擤鼻涕，防止鼻出血',
      '避免使用阿司匹林等影响凝血功能的药物',
      '保持大便通畅，避免用力排便',
      '女性患者注意月经量变化',
    ],
    grades: [
      { level: 'normal', levelName: '正常', range: '≥100×10⁹/L', suggestion: '指标正常，按常规监测', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'Ⅰ度', range: '(75-100)×10⁹/L', suggestion: '居家监测，定期复查', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'Ⅱ度', range: '(50-75)×10⁹/L', suggestion: '建议咨询医生，遵医嘱干预', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'Ⅲ度', range: '(25-50)×10⁹/L', suggestion: '及时就医，遵医嘱治疗', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'Ⅳ度', range: '<25×10⁹/L', suggestion: '立即就医，紧急处理', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'NEUT%',
    name: '中性粒细胞百分比（NEUT%）',
    description: '中性粒细胞占白细胞总数的百分比，结合绝对值更能准确评估骨髓抑制程度。',
    careTips: [
      '结合中性粒细胞绝对值综合判断',
      '注意个人卫生和感染防护',
      '定期复查血常规',
      '如出现感染症状及时就医',
    ],
    grades: [
      { level: 'normal', levelName: '正常', range: '50%-70%', suggestion: '指标正常，按常规监测', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: '轻度', range: '40%-50%', suggestion: '居家监测，定期复查', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: '中度', range: '30%-40%', suggestion: '建议咨询医生', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: '重度', range: '<30%', suggestion: '及时就医评估', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'RBC',
    name: '红细胞计数（RBC）',
    description: '红细胞主要负责运输氧气。红细胞减少会导致贫血症状，影响组织供氧。',
    careTips: [
      '注意休息，避免剧烈运动',
      '均衡饮食，保证营养摄入',
      '定期监测血红蛋白水平',
      '如有头晕、乏力加重及时就医',
    ],
    grades: [
      { level: 'normal', levelName: '正常', range: '≥4.0×10¹²/L（男）/≥3.5×10¹²/L（女）', suggestion: '指标正常，按常规监测', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: '轻度', range: '略低于正常值', suggestion: '居家监测，定期复查', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: '中度', range: '明显低于正常值', suggestion: '建议咨询医生', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: '重度', range: '严重低于正常值', suggestion: '及时就医治疗', color: 'bg-critical/10 text-critical' },
    ],
  },
];

const GradeReferencePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeIndicator, setActiveIndicator] = useState<string>('WBC');
  const [openAccordion, setOpenAccordion] = useState<string>('WBC');
  const indicatorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 解析URL参数，如果指定了指标则自动展开
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const indicatorCode = params.get('indicator');
    if (indicatorCode && referenceData.find(item => item.code === indicatorCode)) {
      setActiveIndicator(indicatorCode);
      setOpenAccordion(indicatorCode);
      // 延迟滚动确保DOM已渲染
      setTimeout(() => {
        scrollToIndicator(indicatorCode);
      }, 100);
    }
  }, [location.search]);

  const scrollToIndicator = (code: string) => {
    const element = indicatorRefs.current[code];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavClick = (code: string) => {
    setActiveIndicator(code);
    setOpenAccordion(code);
    scrollToIndicator(code);
  };

  const handleAccordionChange = (value: string) => {
    setOpenAccordion(value);
    if (value) {
      setActiveIndicator(value);
    }
  };

  return (
    <>
      <style jsx>{`
        .grade-reference-page {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .nav-item {
          transition: all 0.2s ease;
        }
        .nav-item.active {
          background-color: hsl(174 60% 45%);
          color: white;
        }
      `}</style>

      <div className="grade-reference-page w-full max-w-md mx-auto pb-28">
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
            <h1 className="text-lg font-semibold">骨髓抑制分级速查</h1>
            <button
              className="p-2 -mr-2 rounded-full hover:bg-accent transition-colors opacity-50"
              title="搜索功能预留"
            >
              <SearchIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 快速导航栏 */}
        <section className="w-full sticky top-14 z-30 bg-background border-b border-border">
          <div className="px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {referenceData.map((item) => (
                <button
                  key={item.code}
                  onClick={() => handleNavClick(item.code)}
                  className={`nav-item px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    activeIndicator === item.code
                      ? 'active'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {item.code}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 分级规范列表 */}
        <main className="px-4 py-6 space-y-4">
          <Accordion
            type="single"
            collapsible
            value={openAccordion}
            onValueChange={handleAccordionChange}
            className="space-y-4"
          >
            {referenceData.map((indicator) => (
              <div
                key={indicator.code}
                ref={(el) => { indicatorRefs.current[indicator.code] = el; }}
              >
                <AccordionItem
                  value={indicator.code}
                  className="border-0"
                >
                  <Card className="rounded-2xl shadow-sm border-0 overflow-hidden">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]]:bg-accent/30">
                      <CardTitle className="text-base font-semibold text-left">
                        {indicator.name}
                      </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="pt-0 pb-5 px-5 space-y-4">
                        {/* 指标描述 */}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {indicator.description}
                        </p>

                        {/* 分级标准表格 */}
                        <div className="rounded-xl overflow-hidden border border-border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-xs">分级</th>
                                <th className="px-3 py-2 text-left font-medium text-xs">指标范围</th>
                                <th className="px-3 py-2 text-left font-medium text-xs">处理建议</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {indicator.grades.map((grade, index) => (
                                <tr key={index} className="bg-card">
                                  <td className="px-3 py-2">
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${grade.color}`}
                                    >
                                      {grade.levelName}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-xs font-mono">{grade.range}</td>
                                  <td className="px-3 py-2 text-xs">{grade.suggestion}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* 居家照护建议 */}
                        <div className="bg-accent/30 rounded-xl p-4">
                          <h4 className="text-sm font-medium text-foreground mb-2">居家照护建议</h4>
                          <ul className="space-y-1.5">
                            {indicator.careTips.map((tip, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              </div>
            ))}
          </Accordion>

          {/* 通用说明 */}
          <Card className="rounded-2xl shadow-sm border-0 bg-muted/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">关于骨髓抑制分级</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                以上分级标准参考WHO（世界卫生组织）骨髓抑制分级标准。实际处理请遵医嘱，
                本速查表仅供健康科普参考，不能替代执业医师的专业判断。
              </p>
            </CardContent>
          </Card>
        </main>

        {/* 底部合规免责声明 */}
        <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
          <div className="max-w-md mx-auto px-4 py-3">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              本工具仅供内部测试与健康科普参考，不构成任何诊疗建议，不能替代执业医师的专业判断
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default GradeReferencePage;
