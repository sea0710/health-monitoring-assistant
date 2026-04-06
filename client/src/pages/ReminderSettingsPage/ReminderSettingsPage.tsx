import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, PlusIcon, XIcon, BellIcon, InfoIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

// 类型定义
interface IPatient {
  patient_id: string;
  name: string;
  chemotherapy_cycles?: number;
  last_chemo_end_date?: string;
}

interface IReminderItem {
  id: string;
  date: string;
  time: string;
}

const STORAGE_KEY_PATIENT = '__global_bcm_currentPatient';
const STORAGE_KEY_REMINDERS = '__global_bcm_reminders';

const ReminderSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<IPatient | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [reminders, setReminders] = useState<IReminderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载患者信息和提醒设置
  useEffect(() => {
    const loadData = () => {
      try {
        const patientData = localStorage.getItem(STORAGE_KEY_PATIENT);
        const remindersData = localStorage.getItem(STORAGE_KEY_REMINDERS);

        if (patientData) {
          const parsedPatient = JSON.parse(patientData);
          setPatient(parsedPatient);

          // 如果有化疗结束时间，生成建议提醒日期
          if (parsedPatient.last_chemo_end_date && !remindersData) {
            const suggestedReminders = generateSuggestedReminders(parsedPatient.last_chemo_end_date);
            setReminders(suggestedReminders);
          }
        }

        if (remindersData) {
          setReminders(JSON.parse(remindersData));
        }
      } catch (error) {
        logger.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 生成建议提醒日期（化疗后第7、10、14天）
  const generateSuggestedReminders = (chemoEndDate: string): IReminderItem[] => {
    const baseDate = new Date(chemoEndDate);
    const suggestions = [7, 10, 14];

    return suggestions.map((days, index) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + days);
      return {
        id: `reminder_${index}`,
        date: date.toISOString().split('T')[0],
        time: '09:00',
      };
    });
  };

  // 添加新的提醒
  const handleAddReminder = () => {
    const newReminder: IReminderItem = {
      id: `reminder_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
    };
    setReminders([...reminders, newReminder]);
  };

  // 删除提醒
  const handleRemoveReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  // 更新提醒日期
  const handleUpdateDate = (id: string, date: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, date } : r));
  };

  // 更新提醒时间
  const handleUpdateTime = (id: string, time: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, time } : r));
  };

  // 保存提醒设置
  const handleSave = () => {
    if (!isEnabled) {
      localStorage.removeItem(STORAGE_KEY_REMINDERS);
      toast.success('已关闭监测提醒');
      navigate('/home');
      return;
    }

    if (reminders.length === 0) {
      toast.error('请至少添加一个提醒日期');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(reminders));
      toast.success('提醒设置已保存');
      navigate('/home');
    } catch (error) {
      toast.error('保存失败，请重试');
    }
  };

  // 检查是否完善治疗信息
  const hasTreatmentInfo = patient?.last_chemo_end_date;

  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .reminder-settings-page {
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

      <div className="reminder-settings-page w-full max-w-md mx-auto pb-28">
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
            <h1 className="text-lg font-semibold">设置监测提醒</h1>
            <div className="w-14" />
          </div>
        </header>

        {/* 主内容区 */}
        <div className="px-4 py-6 space-y-4">
          {/* 未完善治疗信息提示 */}
          {!hasTreatmentInfo && (
            <Card className="bg-warning/5 border-warning/20 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">请先完善化疗结束时间</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      完善后可基于化疗时间智能生成复查提醒建议
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-8 text-xs"
                      onClick={() => navigate('/patient/create')}
                    >
                      去完善信息
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 提醒规则说明 */}
          {hasTreatmentInfo && (
            <Card className="bg-primary/5 border-primary/20 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">智能提醒建议</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      根据您的化疗结束时间（{patient?.last_chemo_end_date}），建议在化疗后第 7 天、第 10 天、第 14 天复查血常规
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 提醒开关 */}
          <Card className="rounded-2xl shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BellIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">开启监测提醒</p>
                    <p className="text-xs text-muted-foreground">到期自动提醒您复查血常规</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* 提醒时间设置 */}
          {isEnabled && (
            <Card className="rounded-2xl shadow-sm border-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">提醒时间设置</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={handleAddReminder}
                  >
                    <PlusIcon className="w-4 h-4" />
                    添加
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {reminders.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <BellIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">暂无提醒，点击添加</p>
                  </div>
                ) : (
                  reminders.map((reminder, index) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">日期</Label>
                          <Input
                            type="date"
                            value={reminder.date}
                            onChange={(e) => handleUpdateDate(reminder.id, e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">时间</Label>
                          <Input
                            type="time"
                            value={reminder.time}
                            onChange={(e) => handleUpdateTime(reminder.id, e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveReminder(reminder.id)}
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* 提醒方式 */}
          <Card className="rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">提醒方式</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">飞书</span>
                  </div>
                  <span className="text-sm text-foreground">飞书通知</span>
                </div>
                <Badge variant="secondary" className="text-xs">默认</Badge>
              </div>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">
                更多提醒方式（微信服务通知、短信提醒）即将上线
              </p>
            </CardContent>
          </Card>

          {/* 合规免责声明 */}
          <div className="pt-4 pb-2">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              本工具仅供内部测试与健康科普参考，不构成任何诊疗建议，不能替代执业医师的专业判断
            </p>
          </div>
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="bottom-action-bar">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleSave}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90"
          >
            保存提醒
          </Button>
        </div>
      </div>
    </>
  );
};

export default ReminderSettingsPage;
