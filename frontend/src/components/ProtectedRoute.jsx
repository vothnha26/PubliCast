import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#F8F8F7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0A0A0A]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const userRole = user.role?.toUpperCase();
    if (!allowedRoles.includes(userRole)) {
      // Redirect based on role if they try to access an unauthorized route
      if (userRole === 'ADMIN') {
        return <Navigate to="/admin/revenue" replace />;
      }
      if (userRole === 'STAFF') {
        return <Navigate to="/staff/chats" replace />;
      }
      // If customer role (e.g. OWNER) tries to access admin pages
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
