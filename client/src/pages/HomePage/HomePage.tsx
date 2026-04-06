import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, ChevronRightIcon, FileTextIcon, BookOpenIcon, BellIcon, Trash2Icon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { logger } from '@lark-apaas/client-toolkit/logger';

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

interface IReminderItem {
  id: string;
  date: string;
  time: string;
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
  is_edited?: boolean;
  source?: string;
  abnormal_summary?: string;
  abnormal_count?: number;
}

const STORAGE_KEY_PATIENT = '__global_bcm_currentPatient';
const STORAGE_KEY_REPORTS = '__global_bcm_reports';
const STORAGE_KEY_REMINDERS = '__global_bcm_reminders';

const mockReports: IReport[] = [
  {
    report_id: 'rpt_001',
    patient_id: 'pat_001',
    report_type: '血常规',
    test_time: '2024-03-20',
    test_hospital: '协和医院',
    raw_image_url: '',
    create_time: '2024-03-20T10:30:00Z',
    update_time: '2024-03-20T10:30:00Z',
    abnormal_summary: '白细胞↓ 中性粒细胞↓',
    abnormal_count: 2,
  },
  {
    report_id: 'rpt_002',
    patient_id: 'pat_001',
    report_type: '血常规',
    test_time: '2024-03-15',
    test_hospital: '协和医院',
    raw_image_url: '',
    create_time: '2024-03-15T09:00:00Z',
    update_time: '2024-03-15T09:00:00Z',
    abnormal_summary: '指标正常',
    abnormal_count: 0,
  },
  {
    report_id: 'rpt_003',
    patient_id: 'pat_001',
    report_type: '血常规',
    test_time: '2024-03-10',
    test_hospital: '人民医院',
    raw_image_url: '',
    create_time: '2024-03-10T14:20:00Z',
    update_time: '2024-03-10T14:20:00Z',
    abnormal_summary: '血小板↓',
    abnormal_count: 1,
  },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<IPatient | null>(null);
  const [reports, setReports] = useState<IReport[]>([]);
  const [nextReminder, setNextReminder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<IReport | null>(null);

  useEffect(() => {
    const loadData = () => {
      try {
        const patientData = localStorage.getItem(STORAGE_KEY_PATIENT);
        const reportsData = localStorage.getItem(STORAGE_KEY_REPORTS);
        const remindersData = localStorage.getItem(STORAGE_KEY_REMINDERS);

        if (patientData) {
          setPatient(JSON.parse(patientData));
        } else {
          const mockPatient: IPatient = {
            patient_id: 'pat_001',
            user_id: 'user_001',
            name: '张三',
            create_time: '2024-03-01T00:00:00Z',
            update_time: '2024-03-01T00:00:00Z',
          };
          setPatient(mockPatient);
          localStorage.setItem(STORAGE_KEY_PATIENT, JSON.stringify(mockPatient));
        }

        if (reportsData) {
          setReports(JSON.parse(reportsData));
        } else {
          setReports(mockReports);
          localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(mockReports));
        }

        // 加载下次提醒时间
        if (remindersData) {
          const reminders: IReminderItem[] = JSON.parse(remindersData);
          const today = new Date().toISOString().split('T')[0];
          const upcoming = reminders
            .filter(r => r.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))[0];
          if (upcoming) {
            setNextReminder(`${upcoming.date} ${upcoming.time}`);
          }
        }
      } catch (error) {
        logger.error('加载数据失败:', error);
        setReports(mockReports);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddReport = () => {
    navigate('/report/upload');
  };

  const handleReportClick = (reportId: string) => {
    navigate(`/report/${reportId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, report: IReport) => {
    e.stopPropagation();
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      const updatedReports = reports.filter(r => r.report_id !== reportToDelete.report_id);
      setReports(updatedReports);
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updatedReports));
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const handleQuickAccess = (path: string) => {
    navigate(path);
  };

  const getAbnormalBadge = (count: number) => {
    if (count === 0) {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          指标正常
        </Badge>
      );
    }
    if (count <= 1) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          {count}项异常
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
        {count}项异常
      </Badge>
    );
  };

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
        .home-page {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .report-item {
          transition: all 0.2s ease;
        }
        .report-item:active {
          background-color: hsl(174 50% 96%);
        }
      `}</style>

      <div className="home-page w-full max-w-md mx-auto px-4 py-6 pb-24">
        {/* 页面标题栏 */}
        <section className="w-full flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground">我的病历夹</h1>
          <Button
            variant="outline"
            size="icon"
            className="w-10 h-10 rounded-full border-border hover:bg-accent"
            onClick={handleAddReport}
          >
            <PlusIcon className="w-5 h-5 text-foreground" />
          </Button>
        </section>

        {/* 快捷入口栏 */}
        <section className="w-full mb-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-14 rounded-xl border-border bg-card hover:bg-accent justify-start gap-3 px-4"
              onClick={() => handleQuickAccess('/reference')}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpenIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">分级速查</p>
                <p className="text-xs text-muted-foreground">WHO分级标准</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-14 rounded-xl border-border bg-card hover:bg-accent justify-start gap-3 px-4"
              onClick={() => handleQuickAccess('/reminder/settings')}
            >
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <BellIcon className="w-4 h-4 text-warning" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">提醒设置</p>
                <p className="text-xs text-muted-foreground">复查提醒管理</p>
              </div>
            </Button>
          </div>
        </section>

        {/* 患者信息卡片 */}
        <section className="w-full mb-6">
          <Card className="bg-primary border-0 shadow-md rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-foreground/80 mb-1">患者姓名</p>
                  <h2 className="text-2xl font-bold text-primary-foreground">
                    {patient?.name || '未知患者'}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-primary-foreground/80 mb-1">报告总数</p>
                  <p className="text-3xl font-bold text-primary-foreground">{reports.length}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-primary-foreground/20 space-y-2">
                <div className="flex items-center text-primary-foreground/90 text-sm">
                  <span>最近检测：{reports[0]?.test_time || '暂无记录'}</span>
                  <ChevronRightIcon className="w-4 h-4 ml-auto opacity-60" />
                </div>
                {nextReminder && (
                  <div className="flex items-center text-primary-foreground/80 text-xs">
                    <BellIcon className="w-3.5 h-3.5 mr-1.5" />
                    <span>下次提醒：{nextReminder}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 历史报告列表 */}
        <section className="w-full">
          <h3 className="text-lg font-semibold text-foreground mb-3">历史报告</h3>
          
          <Card className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            {reports.length === 0 ? (
              <div className="py-12 text-center">
                <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm">暂无报告</p>
                <p className="text-muted-foreground/60 text-xs mt-1">点击右上角添加第一份报告</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reports.map((report, index) => (
                  <div
                    key={report.report_id}
                    className="report-item p-4 cursor-pointer group"
                    onClick={() => handleReportClick(report.report_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs font-normal">
                            {report.report_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{report.test_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getAbnormalBadge(report.abnormal_count || 0)}
                          {report.abnormal_count && report.abnormal_count > 0 ? (
                            <span className="text-sm text-muted-foreground truncate">
                              {report.abnormal_summary}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <button
                          onClick={(e) => handleDeleteClick(e, report)}
                          className="p-2 rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="删除报告"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </button>
                        <ChevronRightIcon className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除 {reportToDelete?.test_time} 的血常规报告吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1">
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomePage;
