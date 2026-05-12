import React, { useState, useEffect } from 'react';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import { useAppDispatch } from '../../hooks';
import { verifyOTP, resendOTP } from '../../features/auth/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export default function VerifyOTP() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try to get email from state, then fallback to sessionStorage
  const [email, setEmail] = useState(() => {
    const stateEmail = location.state?.email;
    if (stateEmail) {
      sessionStorage.setItem('verify_email', stateEmail);
      return stateEmail;
    }
    return sessionStorage.getItem('verify_email') || '';
  });

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const STORAGE_KEY = `otp_resend_next_time_${email}`;

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }

    const checkTimer = () => {
      const savedTime = localStorage.getItem(STORAGE_KEY);
      if (savedTime) {
        const remaining = Math.ceil((Number(savedTime) - Date.now()) / 1000);
        if (remaining > 0) {
          setCountdown(remaining);
          setCanResend(false);
        } else {
          setCountdown(0);
          setCanResend(true);
        }
      } else {
        // Start initial countdown if never set
        const initialNextTime = Date.now() + 60000;
        localStorage.setItem(STORAGE_KEY, String(initialNextTime));
        setCountdown(60);
        setCanResend(false);
      }
    };

    checkTimer();
  }, [email, STORAGE_KEY, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!email) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Mã OTP phải có 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      await dispatch(verifyOTP({ email, otp })).unwrap();
      toast.success('Kích hoạt tài khoản và đăng nhập thành công!');
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('verify_email');
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.message || 'Xác thực thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setLoading(true);
    try {
      await dispatch(resendOTP(email)).unwrap();
      toast.success('Mã OTP mới đã được gửi!');
      
      const nextTime = Date.now() + 60000;
      localStorage.setItem(STORAGE_KEY, String(nextTime));
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      toast.error(err.message || 'Gửi lại mã thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Xác thực tài khoản</h2>
        <p className="text-slate-400">
          Chúng tôi đã gửi mã OTP đến <span className="text-purple-400 font-semibold">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormInput
          label="Mã OTP"
          placeholder="Nhập 6 chữ số"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          disabled={loading}
        />

        <Button type="submit" className="w-full py-4 text-lg" disabled={loading}>
          {loading ? 'Đang xác thực...' : 'Xác thực'}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm">
          Không nhận được mã?{' '}
          <button 
            onClick={handleResend}
            disabled={!canResend || loading}
            className={`font-medium transition-colors ${
              canResend && !loading 
                ? 'text-purple-400 hover:text-purple-300' 
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            {canResend ? 'Gửi lại mã' : `Gửi lại mã sau ${countdown}s`}
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
