import React, { useState } from 'react';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import { useAppDispatch } from '../../hooks';
import { register } from '../../features/auth/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await dispatch(register({ name, email, password, confirmPassword })).unwrap();
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.');
      navigate('/verify-otp', { state: { email } });
    } catch (err: any) {
      toast.error(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-100 mb-2">Tham gia ngay</h2>
        <p className="text-slate-400">Tạo tài khoản để bắt đầu trải nghiệm</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput 
          label="Họ và tên" 
          placeholder="Nguyễn Văn A"
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          disabled={loading}
          required
        />
        <FormInput 
          label="Email" 
          type="email" 
          placeholder="name@example.com"
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          disabled={loading}
          required
        />
        <FormInput 
          label="Mật khẩu" 
          type="password" 
          placeholder="••••••••"
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          disabled={loading}
          required
        />
        <FormInput 
          label="Xác nhận mật khẩu" 
          type="password" 
          placeholder="••••••••"
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          disabled={loading}
          required
        />
        
        <div className="pt-4">
          <Button type="submit" className="w-full py-4 text-lg" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </Button>
        </div>
      </form>

      <p className="mt-8 text-center text-slate-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
          Đăng nhập ngay
        </Link>
      </p>
    </AuthLayout>
  );
}
