import React, { useState } from 'react';
import AuthLayout from '../../components/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call forgot password endpoint
    alert('If this email exists, a reset link will be sent.');
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl text-slate-100 mb-4">Forgot password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <div className="pt-4">
          <Button type="submit" className="w-full">Send reset link</Button>
        </div>
      </form>
      <p className="mt-4 text-sm text-slate-400">Remembered? <Link to="/login" className="text-purple-400">Sign in</Link></p>
    </AuthLayout>
  );
}
