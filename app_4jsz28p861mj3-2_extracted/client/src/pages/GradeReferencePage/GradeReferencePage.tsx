import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeftIcon, SearchIcon, InfoIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// 分级速查数据
interface IGradeLevel {
  level: string;
  levelName: string;
  range: string;
  principle: string;
  dischargeAdvice?: string;
  color: string;
}

interface IIndicatorReference {
  code: string;
  name: string;
  shortName: string;
  unit: string;
  clinicalSignificance: string;
  careTips: string[];
  grades: IGradeLevel[];
}

const referenceData: IIndicatorReference[] = [
  {
    code: 'ANC',
    name: '中性粒细胞绝对值（ANC/NEUT#）',
    shortName: '中性粒细胞',
    unit: '×10⁹/L',
    clinicalSignificance: '中性粒细胞是白细胞中最重要的抗感染成分，占白细胞总数的50%-70%，是抵抗细菌感染的主力军。其数量下降直接关系到感染风险，尤其是<0.5×10⁹/L时，感染风险急剧增加。',
    careTips: [
      '自我监测：每日早晚测体温，≥37.5℃警惕，≥38.0℃立即就医',
      '生活护理：使用软毛牙刷，避免挖鼻，保持皮肤清洁',
      '避免去人群密集场所，外出佩戴口罩',
      '避免接触感冒、发热患者，保持室内通风',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '≥1.5', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '1.0-1.4', principle: '轻度减少，观察即可，注意感染预防', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '0.5-0.9', principle: '中度减少，需对症处理，考虑使用升白药物', dischargeAdvice: '若中性粒细胞<1.0×10⁹/L，立即皮下注射人粒细胞刺激因子 100μg，每日一次。连续注射3天后复查血常规，持续用药直至白细胞回升至 10.0×10⁹/L 以上', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'III级', range: '0.1-0.4', principle: '重度减少，必须使用升白针，密切监测', dischargeAdvice: '若中性粒细胞<0.5×10⁹/L，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'IV级', range: '<0.1', principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'WBC',
    name: '白细胞计数（WBC）',
    shortName: '白细胞',
    unit: '×10⁹/L',
    clinicalSignificance: '白细胞总数反映整体免疫状态，是人体防御系统的重要组成部分。化疗常导致白细胞减少（白细胞减少症），显著增加感染易感性，严重时可引发致命性感染。',
    careTips: [
      '自我监测：每日早晚测体温，≥37.5℃警惕，≥38.0℃立即就医',
      '生活护理：使用软毛牙刷，避免挖鼻，保持皮肤清洁',
      '避免去人群密集场所，外出佩戴口罩',
      '注意饮食卫生，避免生冷、未煮熟的食物',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '≥4.0', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '3.0-3.9', principle: '轻度减少，观察即可，注意预防感染', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '2.0-2.9', principle: '中度减少，需对症处理，考虑使用升白药物', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'III级', range: '1.0-1.9', principle: '重度减少，必须使用升白针，密切监测', dischargeAdvice: '若白细胞<2.0×10⁹/L 或 中性粒细胞<1.0×10⁹/L，立即皮下注射人粒细胞刺激因子 100μg，每日一次。连续注射3天后复查血常规，持续用药直至白细胞回升至 10.0×10⁹/L 以上', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'IV级', range: '<1.0', principle: '极重度减少，立即使用升白针，预防感染，可能需暂停化疗', dischargeAdvice: '若白细胞<1.0×10⁹/L (或中性粒细胞<0.5×10⁹/L)，或合并发热(体温>38.0℃)，须在升白同时及时使用抗生素，并根据医嘱行血培养检查', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'PLT',
    name: '血小板计数（PLT）',
    shortName: '血小板',
    unit: '×10⁹/L',
    clinicalSignificance: '血小板负责止血功能。减少时易出现自发性出血（如牙龈出血、瘀斑），<20×10⁹/L时为出血危象，可能发生颅内出血。',
    careTips: [
      '自我监测：观察皮肤有无瘀点瘀斑，牙龈有无出血，大便颜色是否变黑',
      '生活护理：避免剧烈运动和碰撞，使用软毛牙刷',
      '进食软食，保持大便通畅，避免用力排便',
      '避免使用阿司匹林等影响凝血功能的药物',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '≥100', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '75-99', principle: '轻度减少，观察即可', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '50-74', principle: '中度减少，需对症处理，考虑使用升血小板药物', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'III级', range: '25-49', principle: '重度减少，必须使用升血小板药物，密切监测', dischargeAdvice: '请皮下注射血小板生成素 1ml 或 白介素-11 1.5mg，每日一次，连续3天后再次复查血常规，直到血小板上升至 70.0×10⁹/L 以上', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'IV级', range: '<25', principle: '极重度减少，立即给予血小板输注及止血药物，预防出血', dischargeAdvice: '若血小板<20.0×10⁹/L属于血小板减少出血危象，应尽快给予血小板输注及应用止血药物治疗', color: 'bg-critical/10 text-critical' },
    ],
  },
  {
    code: 'HGB',
    name: '血红蛋白（HGB）',
    shortName: '血红蛋白',
    unit: 'g/L',
    clinicalSignificance: '血红蛋白负责运输氧气。减少时导致贫血，引起乏力、头晕、心悸等症状，严重时影响心肺功能。',
    careTips: [
      '饮食建议：多进食富含铁、蛋白质和维生素的食物，如瘦肉、动物肝脏、绿叶蔬菜、豆制品等',
      '生活护理：保证充足睡眠，避免劳累，活动时动作缓慢，防止跌倒',
      '起身时动作缓慢，防止体位性低血压',
      '注意保暖，避免受凉',
    ],
    grades: [
      { level: 'normal', levelName: '0级', range: '男≥120/女≥110', principle: '正常范围，无需处理', color: 'bg-success/10 text-success' },
      { level: 'warning', levelName: 'I级', range: '男100-119/女90-109', principle: '轻度减少，观察即可，注意休息', color: 'bg-warning/10 text-warning' },
      { level: 'danger', levelName: 'II级', range: '80-100', principle: '中度减少，需对症处理，考虑使用升红药物', dischargeAdvice: '若血红蛋白<100g/L，除外出血等原因后，可皮下注射促红细胞生成素', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'danger', levelName: 'III级', range: '65-79', principle: '重度减少，必须使用升红药物，密切监测', color: 'bg-orange-500/10 text-orange-600' },
      { level: 'critical', levelName: 'IV级', range: '<65', principle: '极重度减少，立即输血治疗，预防心衰', dischargeAdvice: '若贫血严重（如Hb<60g/L）或有明显心慌、气短等症状，必要时输血治疗', color: 'bg-critical/10 text-critical' },
    ],
  },
];

const GradeReferencePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeIndicator, setActiveIndicator] = useState<string>('ANC');
  const [openAccordion, setOpenAccordion] = useState<string>('ANC');
  const [selectedGrade, setSelectedGrade] = useState<{indicator: IIndicatorReference, grade: IGradeLevel} | null>(null);
  const indicatorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 解析URL参数，如果指定了指标则自动展开
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const indicatorCode = params.get('indicator');
    if (indicatorCode && referenceData.find(item => item.code === indicatorCode)) {
      setActiveIndicator(indicatorCode);
      setOpenAccordion(indicatorCode);
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

  const openGradeDetail = (indicator: IIndicatorReference, grade: IGradeLevel) => {
    setSelectedGrade({ indicator, grade });
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
        .grade-row {
          transition: background-color 0.15s ease;
        }
        .grade-row:active {
          background-color: hsl(var(--accent));
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
                  {item.shortName}
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
                      <div className="text-left">
                        <CardTitle className="text-base font-semibold">
                          {indicator.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">单位: {indicator.unit}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="pt-0 pb-5 px-5 space-y-4">
                        {/* 临床意义 */}
                        <div className="bg-blue-50/50 rounded-xl p-4">
                          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                            <InfoIcon className="w-4 h-4 text-primary" />
                            临床意义
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {indicator.clinicalSignificance}
                          </p>
                        </div>

                        {/* 分级标准表格 */}
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-3">分级标准与处理原则</h4>
                          <div className="rounded-xl overflow-hidden border border-border">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-3 py-2.5 text-left font-medium text-xs">分级</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-xs">指标范围</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-xs">处理原则</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {indicator.grades.map((grade, index) => (
                                  <tr
                                    key={index}
                                    className="grade-row bg-card cursor-pointer"
                                    onClick={() => openGradeDetail(indicator, grade)}
                                  >
                                    <td className="px-3 py-3">
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${grade.color}`}
                                      >
                                        {grade.levelName}
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-3 text-xs font-mono whitespace-nowrap">{grade.range}</td>
                                    <td className="px-3 py-3 text-xs">
                                      <div className="flex items-center gap-1">
                                        <span className="line-clamp-2">{grade.principle}</span>
                                        {grade.dischargeAdvice && (
                                          <InfoIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <InfoIcon className="w-3 h-3" />
                            点击行查看详细出院医嘱
                          </p>
                        </div>

                        {/* 居家照护建议 */}
                        <div className="bg-accent/30 rounded-xl p-4">
                          <h4 className="text-sm font-medium text-foreground mb-3">居家照护建议</h4>
                          <ul className="space-y-2">
                            {indicator.careTips.map((tip, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
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

        {/* 分级详情弹窗 */}
        <Dialog open={!!selectedGrade} onOpenChange={() => setSelectedGrade(null)}>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Badge variant="outline" className={selectedGrade?.grade.color}>
                  {selectedGrade?.grade.levelName}
                </Badge>
                <span className="text-base">{selectedGrade?.indicator.name}</span>
              </DialogTitle>
            </DialogHeader>
            {selectedGrade && (
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">指标范围</p>
                  <p className="text-base font-mono font-semibold">{selectedGrade.grade.range} {selectedGrade.indicator.unit}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">处理原则</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedGrade.grade.principle}</p>
                </div>

                {selectedGrade.grade.dischargeAdvice ? (
                  <div className="bg-orange-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-medium text-orange-700 flex items-center gap-1.5">
                      <InfoIcon className="w-4 h-4" />
                      出院医嘱
                    </p>
                    <p className="text-sm text-orange-600 leading-relaxed">{selectedGrade.grade.dischargeAdvice}</p>
                  </div>
                ) : (
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-green-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      该级别无需特殊医嘱，按常规观察即可
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default GradeReferencePage;
