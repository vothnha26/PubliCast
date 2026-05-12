import React, { useEffect, useState } from 'react';
import AuthLayout from '../../components/AuthLayout';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, ShieldCheck, Zap } from 'lucide-react';
import { clearAuthFeedback, forgotPassword, resetPassword, setAuthError } from '../../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../../hooks';

export default function ForgotPassword() {
  const dispatch = useAppDispatch();
  const { error, message, status } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [completed, setCompleted] = useState(false);
  const loading = status === 'loading';

  useEffect(() => {
    dispatch(clearAuthFeedback());
  }, [dispatch]);

  const handleRequestOtp = async () => {
    await dispatch(forgotPassword(email)).unwrap();
    setStep('reset');
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      dispatch(setAuthError('Passwords do not match'));
      return;
    }

    await dispatch(resetPassword({
      email,
      otp,
      newPassword,
      confirmPassword
    })).unwrap();
    setCompleted(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearAuthFeedback());

    try {
      if (step === 'request') {
        await handleRequestOtp();
      } else {
        await handleResetPassword();
      }
    } catch (err: any) {
      dispatch(setAuthError(err?.message || 'Unable to process your request. Please try again.'));
    }
  };

  return (
    <AuthLayout>
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 rounded-full blur-2xl opacity-40 animate-pulse" />

          <div className="relative">
            <div className="w-28 h-28 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-full flex items-center justify-center shadow-lg mb-3 mx-auto">
              <Zap className="w-14 h-14 text-white" />
            </div>

            <div className="text-center">
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                PubliCast
              </h1>
              <p className="text-sm text-slate-400 mt-1">Password Recovery</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-600/10 border border-purple-500/30 mb-3">
          {completed ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          )}
        </div>
        <h2 className="text-2xl text-slate-100 mb-2">
          {completed ? 'Password updated' : step === 'request' ? 'Forgot password?' : 'Enter reset OTP'}
        </h2>
        <p className="text-sm text-slate-400">
          {completed
            ? 'Return to login and continue streaming.'
            : step === 'request'
              ? 'Enter your account email to receive a reset OTP.'
              : 'Use the OTP from your email and choose a new password.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm">
          {message}
        </div>
      )}

      {!completed ? (
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || step === 'reset'}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-base text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {step === 'reset' && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-2">OTP Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-base text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-base text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-base text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-base font-semibold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? 'Processing...' : step === 'request' ? 'Send OTP' : 'Reset Password'}
          </button>

          {step === 'reset' && (
            <button
              type="button"
              onClick={() => {
                setStep('request');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                dispatch(clearAuthFeedback());
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Change email
            </button>
          )}
        </form>
      ) : (
        <Link
          to="/login"
          className="w-full mb-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-base font-semibold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center"
        >
          Back to Login
        </Link>
      )}

      <p className="text-center text-sm text-slate-400">
        Remembered your password?{' '}
        <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
