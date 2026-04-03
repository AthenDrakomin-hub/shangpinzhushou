/**
 * 忘记密码页面 (密保问题验证版)
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, KeyRound, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordPageProps {
  handleBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function ForgotPasswordPage({ handleBack, showToast }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 第一步：输入邮箱并获取密保问题
  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('请输入账号邮箱', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/get-security-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setQuestion(data.question);
        setStep(2);
      } else {
        showToast(data.error || '获取密保问题失败', 'error');
      }
    } catch (err) {
      showToast('网络错误，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 第二步：验证答案并重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) {
      showToast('请输入密保答案', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('新密码至少需要6个字符', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password-by-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(),
          answer: answer.trim(),
          newPassword
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setStep(3);
      } else {
        showToast(data.error || '验证或重置失败', 'error');
      }
    } catch (err) {
      showToast('网络错误，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-[#0A0E29] text-white overflow-hidden">
      <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-10 w-full max-w-md">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            返回登录
          </button>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                {step === 3 ? <CheckCircle2 className="w-7 h-7 text-white" /> : <ShieldCheck className="w-7 h-7 text-white" />}
              </div>
              <div>
                <h2 className="text-2xl font-black">找回密码</h2>
                <p className="text-white/50 text-sm">通过密保问题验证身份</p>
              </div>
            </div>

            {step === 1 && (
              <form onSubmit={handleGetQuestion} className="space-y-4">
                <div>
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 block">账号邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="输入你的登录邮箱"
                    className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                >
                  {isLoading ? '查询中...' : '下一步'}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                  <p className="text-xs text-white/50 mb-1">密保问题</p>
                  <p className="font-medium">{question}</p>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 block">密保答案</label>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="请输入你的答案"
                    className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 block mt-4">设置新密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少6个字符"
                    className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-all mb-4"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                >
                  {isLoading ? '提交中...' : '重置密码'}
                </button>
              </form>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                <p className="text-white/70 mb-6">您的密码已成功重置，请使用新密码重新登录。</p>
                <button
                  onClick={handleBack}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                >
                  返回登录
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
