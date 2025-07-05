import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, RefreshCw, CheckCircle } from 'lucide-react';
import Button from '../UI/Button';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface EmailVerificationBannerProps {
  user: any;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ user }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const { resendVerificationEmail, checkEmailVerification, signOut } = useAuth();

  if (!user || user.emailVerified || !isVisible) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        toast.success('Email verified! Please refresh the page.');
        window.location.reload();
      } else {
        toast.error('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error: any) {
      toast.error('Failed to check verification status');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-orange-600 border-b border-orange-500"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-white" />
              <div>
                <p className="text-white font-medium">
                  Please verify your email address
                </p>
                <p className="text-orange-100 text-sm">
                  We sent a verification link to {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCheckVerification}
                className="text-white hover:bg-orange-700 border-white/20"
                icon={<CheckCircle className="h-4 w-4" />}
              >
                I've Verified
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResendVerification}
                disabled={isResending}
                loading={isResending}
                className="text-white hover:bg-orange-700 border-white/20"
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Resend
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleSignOut}
                className="text-white hover:bg-orange-700 border-white/20"
              >
                Sign Out
              </Button>

              <button
                onClick={() => setIsVisible(false)}
                className="text-white hover:text-orange-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmailVerificationBanner;