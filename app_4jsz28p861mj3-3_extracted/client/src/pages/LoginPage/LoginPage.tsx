import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EyeIcon, EyeOffIcon, PhoneIcon, LockIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ILoginPageProps {}

interface IUser {
  user_id: string;
  phone: string;
  password: string;
  create_time: string;
  update_time: string;
}

const STORAGE_KEY_USER = '__global_bcm_user';
const STORAGE_KEY_PATIENT = '__global_bcm_currentPatient';

const LoginPage: React.FC<ILoginPageProps> = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePhone = (value: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(value);
  };

  const validatePassword = (value: string): boolean => {
    return value.length >= 6;
  };

  const handleLogin = async () => {
    if (!validatePhone(phone)) {
      toast.error('请输入正确的11位手机号');
      return;
    }

    if (!validatePassword(password)) {
      toast.error('密码至少需要6位');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const existingUser = localStorage.getItem(STORAGE_KEY_USER);
      let isNewUser = true;

      if (existingUser) {
        const user: IUser = JSON.parse(existingUser);
        if (user.phone === phone) {
          isNewUser = false;
          if (user.password !== password) {
            toast.error('密码错误');
            setIsLoading(false);
            return;
          }
        }
      }

      const user: IUser = {
        user_id: isNewUser ? `user_${Date.now()}` : JSON.parse(existingUser!).user_id,
        phone,
        password,
        create_time: isNewUser ? new Date().toISOString() : JSON.parse(existingUser!).create_time,
        update_time: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));

      const existingPatient = localStorage.getItem(STORAGE_KEY_PATIENT);

      toast.success(isNewUser ? '注册成功' : '登录成功');

      if (isNewUser || !existingPatient) {
        navigate('/patient/create');
      } else {
        navigate('/home');
      }
    } catch (error) {
      toast.error('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        .login-page {
          min-height: 100%;
          display: flex;
          flex-direction: column;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>

      <section className="w-full flex-1 flex flex-col px-4 py-6">
        <div className="flex-1 flex flex-col">
          <div className="pt-12 pb-8 text-center fade-in">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[hsl(174_60%_45%)] to-[hsl(174_50%_55%)] flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">愈见</h1>
            <p className="text-sm text-muted-foreground mt-1">血常规监测助手</p>
          </div>

          <div className="flex-1 space-y-5 fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                手机号
              </Label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入11位手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 pl-10 rounded-xl border-input bg-surface"
                  maxLength={11}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                密码
              </Label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码（至少6位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 pr-10 rounded-xl border-input bg-surface"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent transition-colors"
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-[hsl(174_60%_45%)] hover:bg-[hsl(174_60%_40%)] text-white font-semibold text-base mt-4"
            >
              {isLoading ? '请稍候...' : '登录 / 注册'}
            </Button>

            <div className="text-center pt-4">
              <p className="text-xs text-muted-foreground">
                登录即表示您同意相关服务条款
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 pb-2 text-center">
          <p className="text-xs text-muted-foreground leading-relaxed">
            本工具仅供内部测试与健康科普参考，不构成任何诊疗建议，不能替代执业医师的专业判断
          </p>
        </div>
      </section>
    </>
  );
};

export default LoginPage;
