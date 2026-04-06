import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ChevronLeftIcon, UploadIcon, XIcon, ImageIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

// 扩展指标项
interface IExtendedIndicator {
  code: string;
  name: string;
  value: string;
  reference: string;
  unit: string;
}

// OCR 结果类型
interface IOCRResult {
  hospital: string;
  test_time: string;
  patient_name: string;
  wbc_value: string;
  wbc_reference: string;
  wbc_unit: string;
  neut_abs_value: string;
  neut_abs_reference: string;
  neut_abs_unit: string;
  neut_percent_value: string;
  neut_percent_reference: string;
  neut_percent_unit: string;
  rbc_value: string;
  rbc_reference: string;
  rbc_unit: string;
  hgb_value: string;
  hgb_reference: string;
  hgb_unit: string;
  plt_value: string;
  plt_reference: string;
  plt_unit: string;
}

interface IReportUploadPageProps {}

const STORAGE_KEY_USER = '__global_bcm_user';
const STORAGE_KEY_PATIENT = '__global_bcm_currentPatient';
const STORAGE_KEY_REPORTS = '__global_bcm_reports';
const STORAGE_KEY_INDICATORS = '__global_bcm_indicators';

const mockExtendedIndicators: IExtendedIndicator[] = [
  { code: 'LYM#', name: '淋巴细胞绝对值', value: '2.1', reference: '1.1-3.2', unit: '×10⁹/L' },
  { code: 'LYM%', name: '淋巴细胞百分比', value: '35.0', reference: '20-50', unit: '%' },
  { code: 'MON#', name: '单核细胞绝对值', value: '0.4', reference: '0.1-0.6', unit: '×10⁹/L' },
  { code: 'MON%', name: '单核细胞百分比', value: '8.0', reference: '3-10', unit: '%' },
  { code: 'EO#', name: '嗜酸性粒细胞绝对值', value: '0.15', reference: '0.02-0.52', unit: '×10⁹/L' },
  { code: 'EO%', name: '嗜酸性粒细胞百分比', value: '2.5', reference: '0.4-8.0', unit: '%' },
  { code: 'BASO#', name: '嗜碱性粒细胞绝对值', value: '0.02', reference: '0-0.06', unit: '×10⁹/L' },
  { code: 'BASO%', name: '嗜碱性粒细胞百分比', value: '0.4', reference: '0-1', unit: '%' },
  { code: 'MCV', name: '平均红细胞体积', value: '88.5', reference: '82-100', unit: 'fL' },
  { code: 'MCH', name: '平均红细胞血红蛋白含量', value: '29.5', reference: '27-34', unit: 'pg' },
  { code: 'MCHC', name: '平均红细胞血红蛋白浓度', value: '335', reference: '316-354', unit: 'g/L' },
  { code: 'RDW-CV', name: '红细胞分布宽度变异系数', value: '12.5', reference: '11-16', unit: '%' },
  { code: 'MPV', name: '平均血小板体积', value: '10.5', reference: '7-13', unit: 'fL' },
  { code: 'PDW', name: '血小板分布宽度', value: '15.2', reference: '9-17', unit: 'fL' },
  { code: 'PCT', name: '血小板压积', value: '0.25', reference: '0.11-0.28', unit: '%' },
];

const ReportUploadPage: React.FC<IReportUploadPageProps> = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [showExtendedIndicators, setShowExtendedIndicators] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState<Partial<IOCRResult>>({
    hospital: '',
    test_time: '',
    patient_name: '',
    wbc_value: '',
    wbc_reference: '',
    wbc_unit: '',
    neut_abs_value: '',
    neut_abs_reference: '',
    neut_abs_unit: '',
    neut_percent_value: '',
    neut_percent_reference: '',
    neut_percent_unit: '',
    rbc_value: '',
    rbc_reference: '',
    rbc_unit: '',
    hgb_value: '',
    hgb_reference: '',
    hgb_unit: '',
    plt_value: '',
    plt_reference: '',
    plt_unit: '',
  });

  const [extendedIndicators, setExtendedIndicators] = useState<IExtendedIndicator[]>(mockExtendedIndicators);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 显示预览
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setIsUploading(true);

    // 模拟上传完成
    setTimeout(() => {
      setIsUploading(false);
      handleOCRRecognition(file);
    }, 1000);
  };

  const handleOCRRecognition = async (file: File) => {
    setIsRecognizing(true);
    
    try {
      // 调用OCR插件识别
      const result = await capabilityClient
        .load('blood_routine_report_ocr_extract')
        .call('imageToJson', { report_image: [file] }) as IOCRResult;
      
      if (result) {
        setFormData(prev => ({
          ...prev,
          ...result,
        }));
        toast.success('识别完成，请核对信息');
      }
    } catch (error) {
      logger.error('OCR识别失败:', error);
      // 使用模拟数据填充
      setFormData({
        hospital: 'XX市人民医院',
        test_time: new Date().toISOString().split('T')[0],
        patient_name: '张三',
        wbc_value: '6.2',
        wbc_reference: '4.0-10.0',
        wbc_unit: '×10⁹/L',
        neut_abs_value: '3.5',
        neut_abs_reference: '2.0-7.0',
        neut_abs_unit: '×10⁹/L',
        neut_percent_value: '56.5',
        neut_percent_reference: '50-70',
        neut_percent_unit: '%',
        rbc_value: '4.5',
        rbc_reference: '3.5-5.5',
        rbc_unit: '×10¹²/L',
        hgb_value: '135',
        hgb_reference: '110-160',
        hgb_unit: 'g/L',
        plt_value: '250',
        plt_reference: '100-300',
        plt_unit: '×10⁹/L',
      });
      toast.info('识别服务暂不可用，已填充模拟数据');
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleReupload = () => {
    setUploadedImage(null);
    setFormData({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (field: keyof IOCRResult, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExtendedIndicatorChange = (index: number, field: keyof IExtendedIndicator, value: string) => {
    setExtendedIndicators(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const isAbnormal = (value: string, reference: string): boolean => {
    if (!value || !reference) return false;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;
    
    const refs = reference.split('-').map(r => parseFloat(r.trim())).filter(r => !isNaN(r));
    if (refs.length !== 2) return false;
    
    return numValue < refs[0] || numValue > refs[1];
  };

  const getTrendArrow = (value: string, reference: string): string => {
    if (!value || !reference) return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    
    const refs = reference.split('-').map(r => parseFloat(r.trim())).filter(r => !isNaN(r));
    if (refs.length !== 2) return '';
    
    if (numValue < refs[0]) return '↓';
    if (numValue > refs[1]) return '↑';
    return '';
  };

  const handleArchive = () => {
    // 生成报告ID
    const reportId = `report_${Date.now()}`;
    const currentTime = new Date().toISOString();
    
    // 获取当前用户和患者
    const userData = JSON.parse(localStorage.getItem(STORAGE_KEY_USER) || '{}');
    const patientData = JSON.parse(localStorage.getItem(STORAGE_KEY_PATIENT) || '{}');
    
    // 保存报告数据
    const reportData = {
      report_id: reportId,
      patient_id: patientData.patient_id || 'patient_default',
      report_type: '血常规',
      test_time: formData.test_time || currentTime.split('T')[0],
      test_hospital: formData.hospital || '',
      raw_image_url: uploadedImage || '',
      create_time: currentTime,
      update_time: currentTime,
    };
    
    // 保存到localStorage
    const existingReports = JSON.parse(localStorage.getItem(STORAGE_KEY_REPORTS) || '[]');
    existingReports.unshift(reportData);
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(existingReports));
    
    // 保存指标数据
    const coreIndicators = [
      { code: 'WBC', name: '白细胞计数', value: formData.wbc_value, reference: formData.wbc_reference, unit: formData.wbc_unit },
      { code: 'NEUT#', name: '中性粒细胞绝对值', value: formData.neut_abs_value, reference: formData.neut_abs_reference, unit: formData.neut_abs_unit },
      { code: 'NEUT%', name: '中性粒细胞百分比', value: formData.neut_percent_value, reference: formData.neut_percent_reference, unit: formData.neut_percent_unit },
      { code: 'RBC', name: '红细胞计数', value: formData.rbc_value, reference: formData.rbc_reference, unit: formData.rbc_unit },
      { code: 'HGB', name: '血红蛋白', value: formData.hgb_value, reference: formData.hgb_reference, unit: formData.hgb_unit },
      { code: 'PLT', name: '血小板计数', value: formData.plt_value, reference: formData.plt_reference, unit: formData.plt_unit },
    ];
    
    const allIndicators = [...coreIndicators, ...extendedIndicators].map((ind, idx) => ({
      indicator_id: `ind_${reportId}_${idx}`,
      report_id: reportId,
      indicator_code: ind.code,
      indicator_name: ind.name,
      test_value: parseFloat(ind.value) || 0,
      reference_min: ind.reference.split('-')[0] ? parseFloat(ind.reference.split('-')[0].trim()) : null,
      reference_max: ind.reference.split('-')[1] ? parseFloat(ind.reference.split('-')[1].trim()) : null,
      unit: ind.unit,
      is_abnormal: isAbnormal(ind.value, ind.reference),
      abnormal_level: isAbnormal(ind.value, ind.reference) ? 'warning' : 'normal',
    }));
    
    const existingIndicators = JSON.parse(localStorage.getItem(STORAGE_KEY_INDICATORS) || '[]');
    existingIndicators.push(...allIndicators);
    localStorage.setItem(STORAGE_KEY_INDICATORS, JSON.stringify(existingIndicators));
    
    // 跳转到报告详情页
    navigate(`/report/${reportId}`);
    toast.success('报告已归档');
  };

  const coreIndicatorsConfig = [
    { key: 'wbc_value', ref: 'wbc_reference', unit: 'wbc_unit', label: '白细胞计数 (WBC)', highlight: true },
    { key: 'neut_abs_value', ref: 'neut_abs_reference', unit: 'neut_abs_unit', label: '中性粒细胞绝对值 (NEUT#)', highlight: true },
    { key: 'neut_percent_value', ref: 'neut_percent_reference', unit: 'neut_percent_unit', label: '中性粒细胞百分比 (NEUT%)', highlight: true },
    { key: 'rbc_value', ref: 'rbc_reference', unit: 'rbc_unit', label: '红细胞计数 (RBC)', highlight: true },
    { key: 'hgb_value', ref: 'hgb_reference', unit: 'hgb_unit', label: '血红蛋白 (HGB)', highlight: true },
    { key: 'plt_value', ref: 'plt_reference', unit: 'plt_unit', label: '血小板计数 (PLT)', highlight: true },
  ];

  return (
    <>
      <style jsx>{`
        .upload-page {
          min-height: 100%;
          background: var(--background);
        }
        .upload-zone {
          border: 2px dashed var(--border);
          transition: all 0.2s ease;
        }
        .upload-zone:hover {
          border-color: var(--primary);
          background: var(--accent);
        }
        .upload-zone.active {
          border-color: var(--primary);
          background: var(--accent);
        }
        .indicator-input {
          font-family: var(--font-mono);
        }
      `}</style>

      <div className="upload-page w-full">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-accent flex items-center gap-1 text-foreground"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span className="text-sm">返回</span>
            </button>
            <h1 className="text-lg font-semibold text-foreground">上传血常规报告</h1>
            <div className="w-16"></div>
          </div>
        </div>

        {/* 主内容 */}
        <div className="px-4 py-4 pb-32 max-w-md mx-auto space-y-4">
          {/* 图片上传区域 */}
          {!uploadedImage ? (
            <div
              className="upload-zone rounded-2xl p-8 text-center cursor-pointer bg-accent/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-primary" />
              </div>
              <p className="text-base font-medium text-foreground mb-2">点击或拖拽上传图片</p>
              <p className="text-sm text-muted-foreground mb-1">支持 JPG、PNG 格式</p>
              <p className="text-xs text-muted-foreground">请对齐血常规报告边框拍摄</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="血常规报告"
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={handleReupload}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 flex items-center justify-center shadow-sm hover:bg-background"
                >
                  <XIcon className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </Card>
          )}

          {/* 识别结果表单 */}
          {uploadedImage && (
            <>
              {/* 基础信息 */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-base font-semibold text-foreground">基础信息</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">检测医院</Label>
                      <Input
                        value={formData.hospital || ''}
                        onChange={(e) => handleInputChange('hospital', e.target.value)}
                        placeholder="请输入检测医院"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">检测时间</Label>
                      <Input
                        type="date"
                        value={formData.test_time || ''}
                        onChange={(e) => handleInputChange('test_time', e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">患者姓名</Label>
                      <Input
                        value={formData.patient_name || ''}
                        onChange={(e) => handleInputChange('patient_name', e.target.value)}
                        placeholder="请输入患者姓名"
                        className="h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 核心指标 */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-base font-semibold text-foreground">核心指标</h3>
                  <div className="space-y-3">
                    {coreIndicatorsConfig.map((config) => {
                      const value = formData[config.key as keyof IOCRResult] || '';
                      const reference = formData[config.ref as keyof IOCRResult] || '';
                      const abnormal = isAbnormal(value, reference);
                      const arrow = getTrendArrow(value, reference);
                      
                      return (
                        <div key={config.key} className="space-y-1.5">
                          <Label className={`text-sm ${abnormal ? 'text-destructive' : ''}`}>
                            {config.label}
                            {abnormal && <span className="ml-1 text-destructive font-bold">{arrow}</span>}
                          </Label>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              value={value}
                              onChange={(e) => handleInputChange(config.key as keyof IOCRResult, e.target.value)}
                              placeholder="数值"
                              className={`h-10 indicator-input text-center ${abnormal ? 'text-destructive border-destructive' : ''}`}
                            />
                            <Input
                              value={reference}
                              onChange={(e) => handleInputChange(config.ref as keyof IOCRResult, e.target.value)}
                              placeholder="参考值"
                              className="h-10 text-center text-sm text-muted-foreground"
                            />
                            <Input
                              value={formData[config.unit as keyof IOCRResult] || ''}
                              onChange={(e) => handleInputChange(config.unit as keyof IOCRResult, e.target.value)}
                              placeholder="单位"
                              className="h-10 text-center text-sm text-muted-foreground"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 其他指标（可折叠） */}
              <Card>
                <CardContent className="p-0">
                  <button
                    onClick={() => setShowExtendedIndicators(!showExtendedIndicators)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors rounded-t-lg"
                  >
                    <span className="text-base font-semibold text-foreground">其他指标</span>
                    {showExtendedIndicators ? (
                      <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  
                  {showExtendedIndicators && (
                    <>
                      <Separator />
                      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                        {extendedIndicators.map((indicator, index) => {
                          const abnormal = isAbnormal(indicator.value, indicator.reference);
                          const arrow = getTrendArrow(indicator.value, indicator.reference);
                          
                          return (
                            <div key={indicator.code} className="space-y-1.5">
                              <Label className={`text-sm ${abnormal ? 'text-destructive' : ''}`}>
                                {indicator.name} ({indicator.code})
                                {abnormal && <span className="ml-1 text-destructive font-bold">{arrow}</span>}
                              </Label>
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  value={indicator.value}
                                  onChange={(e) => handleExtendedIndicatorChange(index, 'value', e.target.value)}
                                  placeholder="数值"
                                  className={`h-10 indicator-input text-center ${abnormal ? 'text-destructive border-destructive' : ''}`}
                                />
                                <Input
                                  value={indicator.reference}
                                  onChange={(e) => handleExtendedIndicatorChange(index, 'reference', e.target.value)}
                                  placeholder="参考值"
                                  className="h-10 text-center text-sm text-muted-foreground"
                                />
                                <Input
                                  value={indicator.unit}
                                  onChange={(e) => handleExtendedIndicatorChange(index, 'unit', e.target.value)}
                                  placeholder="单位"
                                  className="h-10 text-center text-sm text-muted-foreground"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* 底部固定操作栏 */}
        {uploadedImage && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
            <div className="flex items-center gap-3 p-4 max-w-md mx-auto">
              <Button
                variant="outline"
                onClick={handleReupload}
                className="flex-1 h-12 rounded-xl"
              >
                重新上传
              </Button>
              <Button
                onClick={handleArchive}
                className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-semibold"
              >
                确认归档
              </Button>
            </div>
          </div>
        )}

        {/* 识别中提示 */}
        {isRecognizing && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[60]">
            <div className="bg-card rounded-2xl p-6 shadow-lg text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-foreground font-medium">正在识别报告...</p>
              <p className="text-sm text-muted-foreground mt-1">请稍候</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReportUploadPage;
