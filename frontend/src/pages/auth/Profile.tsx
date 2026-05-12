import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logout } from '../../features/auth/authSlice';

export default function Profile() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl text-slate-100 mb-4">Profile</h1>
        <div className="bg-slate-800 p-6 rounded-xl">
          <div className="mb-4">Name: <strong>{user?.name || '-'}</strong></div>
          <div className="mb-4">Email: <strong>{user?.email || '-'}</strong></div>
          <div>
            <button onClick={() => dispatch(logout())} className="px-4 py-2 bg-red-600 rounded-lg text-white">Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}
