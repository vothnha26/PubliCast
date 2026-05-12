import React, { useState } from 'react';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import { useAppDispatch } from '../../hooks';
import { login } from '../../features/auth/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Zap } from 'lucide-react';

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await dispatch(login({ email, password })).unwrap();
      if (res?.user) {
        navigate('/profile');
      }
    } catch (err: any) {
      let errorMsg = 'Đăng nhập thất bại. Vui lòng thử lại.';
      const backendMsg = err?.message || (typeof err === 'string' ? err : '');
      
      // Translate backend error messages to Vietnamese
      const errorMap: { [key: string]: string } = {
        'Email does not exist': 'Tên đăng nhập không tồn tại',
        'Password is incorrect': 'Sai mật khẩu',
        'Invalid email or password': 'Tên đăng nhập hoặc mật khẩu không đúng',
        'Account not activated': 'Tài khoản chưa được kích hoạt. Vui lòng xác nhận email.',
        'Your account has been banned': 'Tài khoản của bạn đã bị khóa',
        'Too many login attempts': 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.',
        'Email is required': 'Email là bắt buộc',
        'Invalid email address': 'Định dạng email không hợp lệ',
        'Password is required': 'Mật khẩu là bắt buộc',
        'Password must be at least 8 characters long': 'Mật khẩu phải có ít nhất 8 ký tự'
      };
      
      // Check if backend message matches any known error
      for (const [key, value] of Object.entries(errorMap)) {
        if (backendMsg.includes(key)) {
          errorMsg = value;
          break;
        }
      }
      
      // If no match found, use the backend message or default
      if (errorMsg === 'Đăng nhập thất bại. Vui lòng thử lại.' && backendMsg) {
        errorMsg = backendMsg;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* App Logo & Title */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          {/* Logo Background Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 rounded-full blur-2xl opacity-40 animate-pulse" />
          
          {/* Logo Container */}
          <div className="relative">
            {/* Brand Circle */}
            <div className="w-28 h-28 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-full flex items-center justify-center shadow-lg mb-3 mx-auto">
              <Zap className="w-14 h-14 text-white" />
            </div>
            
            {/* App Name with Background */}
            <div className="text-center">
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                PubliCast
              </h1>
              <p className="text-sm text-slate-400 mt-1">Pro Streaming</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        {/* Email Input */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-base text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-base text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 cursor-pointer accent-purple-600 disabled:opacity-50"
            />
            <span className="text-slate-400">Remember me</span>
          </label>
          <Link to="/forgot" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Forgot?
          </Link>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-base font-semibold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-900/40 text-slate-500">OR LOGIN WITH</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button className="p-3 rounded-lg border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all flex items-center justify-center text-2xl">
          🎮
        </button>
        <button className="p-3 rounded-lg border border-slate-700 hover:border-red-500/50 hover:bg-slate-800/50 transition-all flex items-center justify-center text-2xl">
          📺
        </button>
        <button className="p-3 rounded-lg border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all flex items-center justify-center text-2xl">
          👤
        </button>
      </div>

      {/* Register Link */}
      <p className="text-center text-sm text-slate-400">
        Không có tài khoản?{' '}
        <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
          Đăng ký
        </Link>
      </p>
    </AuthLayout>
  );
}
