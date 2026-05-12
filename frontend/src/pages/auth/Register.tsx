import React, { useState } from 'react';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import { useAppDispatch } from '../../hooks';
import { register } from '../../features/auth/authSlice';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dispatch(register({ name, email, password })).unwrap();
      if (res) navigate('/profile');
    } catch (err) {
      // handle error
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl text-slate-100 mb-4">Create your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Full name" value={name} onChange={(e)=>setName(e.target.value)} />
        <FormInput label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <FormInput label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <div className="pt-4">
          <Button type="submit" className="w-full">Register</Button>
        </div>
      </form>
      <p className="mt-4 text-sm text-slate-400">Already have an account? <Link to="/login" className="text-purple-400">Sign in</Link></p>
    </AuthLayout>
  );
}
