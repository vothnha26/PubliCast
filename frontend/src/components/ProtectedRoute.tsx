import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useSelector((state: RootState) => state.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
