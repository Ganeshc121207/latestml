import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, BookOpen, CheckCircle, RefreshCw } from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface AuthFormData {
  email: string;
  password: string;
  displayName?: string;
  role?: 'admin' | 'student';
}

const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  
  const { signIn, signUp, loading, resendVerificationEmail, checkEmailVerification } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>();

  const onSubmit = async (data: AuthFormData) => {
    try {
      if (isSignUp) {
        const result = await signUp(data.email, data.password, data.displayName!, data.role || 'student');
        if (result.needsVerification) {
          setVerificationEmail(data.email);
          setShowVerificationMessage(true);
          toast.success('Account created! Please check your email to verify your account.');
        }
      } else {
        await signIn(data.email, data.password);
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    }
  };

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
        setShowVerificationMessage(false);
        toast.success('Email verified! You can now sign in.');
      } else {
        toast.error('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error: any) {
      toast.error('Failed to check verification status');
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setShowVerificationMessage(false);
    reset();
  };

  const goBackToAuth = () => {
    setShowVerificationMessage(false);
    setIsSignUp(false);
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <BookOpen className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">MathLearn</h1>
          <p className="text-dark-300">Your journey to mathematical excellence</p>
        </div>

        <Card className="p-8">
          <AnimatePresence mode="wait">
            {showVerificationMessage ? (
              <motion.div
                key="verification"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 bg-accent-600 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Check Your Email</h2>
                  <p className="text-dark-300 mb-4">
                    We've sent a verification link to:
                  </p>
                  <p className="text-primary-400 font-medium mb-4">{verificationEmail}</p>
                  <p className="text-dark-300 text-sm">
                    Click the link in the email to verify your account, then return here to sign in.
                  </p>
                </div>

                <div className="bg-dark-700 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-accent-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-dark-300">
                      <p className="font-medium text-white mb-1">Next Steps:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click the verification link</li>
                        <li>Return here and sign in</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleCheckVerification}
                    className="w-full"
                    icon={<CheckCircle className="h-4 w-4" />}
                  >
                    I've Verified My Email
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleResendVerification}
                    disabled={isResending}
                    loading={isResending}
                    className="w-full"
                    icon={<RefreshCw className="h-4 w-4" />}
                  >
                    Resend Verification Email
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={goBackToAuth}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-dark-300">
                    {isSignUp ? 'Join thousands of learners' : 'Sign in to your account'}
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {isSignUp && (
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
                        <input
                          type="text"
                          {...register('displayName', { required: isSignUp })}
                          className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      </div>
                      {errors.displayName && (
                        <p className="mt-1 text-sm text-red-400">Name is required</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input
                        type="email"
                        {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
                        className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-400">Valid email is required</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input
                        type="password"
                        {...register('password', { required: true, minLength: 6 })}
                        className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter your password"
                      />
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-400">Password must be at least 6 characters</p>
                    )}
                  </div>

                  {isSignUp && (
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Account Type
                      </label>
                      <select
                        {...register('role')}
                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="student">Student</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={loading}
                  >
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-dark-300">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                    >
                      {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthForm;