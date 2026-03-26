import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface IPatientCreatePageProps {}

interface IPatient {
  patient_id: string;
  user_id: string;
  name: string;
  create_time: string;
  update_time: string;
  gender?: string;
  birthday?: string;
  tumor_type?: string;
  treatment_plan?: string;
  chemotherapy_cycles?: number;
  last_chemo_end_date?: string;
}

const STORAGE_KEY_PATIENT = '__global_bcm_currentPatient';

const PatientCreatePage: React.FC<IPatientCreatePageProps> = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [chemotherapyCycles, setChemotherapyCycles] = useState('');
  const [lastChemoEndDate, setLastChemoEndDate] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    navigate(-1);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('请输入患者姓名');
      return false;
    }
    setError('');
    return true;
  };

  const handleSaveOnly = async () => {
    if (!validateForm()) return;
    await savePatient(false);
  };

  const handleSaveAndSetupReminder = async () => {
    if (!validateForm()) return;
    await savePatient(true);
  };

  const savePatient = async (goToReminder: boolean) => {
    setIsLoading(true);

    try {
      const newPatient: IPatient = {
        patient_id: `patient_${Date.now()}`,
        user_id: 'current_user',
        name: name.trim(),
        chemotherapy_cycles: chemotherapyCycles ? parseInt(chemotherapyCycles) : undefined,
        last_chemo_end_date: lastChemoEndDate || undefined,
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY_PATIENT, JSON.stringify(newPatient));

      if (goToReminder) {
        navigate('/reminder/settings');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        .patient-create-page {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          background: hsl(40 20% 98%);
        }
        .page-header {
          position: sticky;
          top: 0;
          z-index: 40;
          height: 56px;
          background: hsl(40 20% 98% / 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid hsl(220 13% 90%);
          display: flex;
          align-items: center;
          padding: 0 16px;
        }
        .page-content {
          flex: 1;
          padding: 24px 16px;
          padding-bottom: 120px;
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

      <div className="patient-create-page">
        {/* 页面头部 */}
        <header className="page-header">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-foreground text-center -ml-9">
            完善患者信息
          </h1>
        </header>

        {/* 页面内容 */}
        <main className="page-content max-w-md mx-auto w-full">
          <Card className="rounded-2xl shadow-sm border-border">
            <CardContent className="p-6 space-y-6">
              {/* 基础信息区 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">基础信息</h3>
                {/* 姓名输入 */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    患者姓名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="请输入患者姓名"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError('');
                    }}
                    className="h-12 rounded-xl border-input bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* 治疗信息区 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">治疗信息（选填）</h3>
                <div className="space-y-4">
                  {/* 化疗周期 */}
                  <div className="space-y-2">
                    <Label htmlFor="cycles" className="text-sm font-medium text-foreground">
                      当前化疗周期数
                    </Label>
                    <Input
                      id="cycles"
                      type="number"
                      placeholder="如：第 3 周期"
                      value={chemotherapyCycles}
                      onChange={(e) => setChemotherapyCycles(e.target.value)}
                      className="h-12 rounded-xl border-input bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* 化疗结束时间 */}
                  <div className="space-y-2">
                    <Label htmlFor="chemoDate" className="text-sm font-medium text-foreground">
                      当次化疗结束时间
                    </Label>
                    <Input
                      id="chemoDate"
                      type="date"
                      placeholder="请选择结束日期"
                      value={lastChemoEndDate}
                      onChange={(e) => setLastChemoEndDate(e.target.value)}
                      className="h-12 rounded-xl border-input bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* 提示文案 */}
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <InfoIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-xs">完善后可设置血常规监测提醒，及时掌握指标变化</p>
                  </div>
                </div>
              </div>

              {/* 扩展字段预留位置（当前隐藏） */}
              {/*
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">性别</Label>
                <Input disabled placeholder="预留字段" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">出生年月</Label>
                <Input disabled placeholder="预留字段" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">肿瘤类型</Label>
                <Input disabled placeholder="预留字段" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">治疗方案</Label>
                <Input disabled placeholder="预留字段" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">主管医生</Label>
                <Input disabled placeholder="预留字段" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">治疗医院</Label>
                <Input disabled placeholder="预留字段" className="h-12 rounded-xl" />
              </div>
              */}
            </CardContent>
          </Card>
        </main>

        {/* 底部固定操作栏 */}
        <div className="bottom-action-bar">
          <div className="max-w-md mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveOnly}
              disabled={isLoading}
              className="flex-1 h-12 rounded-full font-medium text-base border-border hover:bg-accent"
            >
              仅保存
            </Button>
            <Button
              onClick={handleSaveAndSetupReminder}
              disabled={isLoading}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? '保存中...' : '保存并设置提醒'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PatientCreatePage;
