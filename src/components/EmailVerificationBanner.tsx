/**
 * 邮箱验证提示横幅
 */

import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { motion } from 'motion/react';

interface EmailVerificationBannerProps {
  email: string | null;
  onResend: () => void;
  isResending: boolean;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  email,
  onResend,
  isResending
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">
            您的邮箱 <span className="font-bold">{email}</span> 尚未验证，部分功能可能受限
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResend}
            disabled={isResending}
            className="text-sm text-amber-400 hover:text-amber-300 font-medium disabled:opacity-50 flex items-center gap-1"
          >
            {isResending ? (
              <>
                <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                发送中...
              </>
            ) : (
              '重发验证邮件'
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default EmailVerificationBanner;
