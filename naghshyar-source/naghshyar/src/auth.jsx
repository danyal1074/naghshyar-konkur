import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from './api';
import { Loading } from './ui';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export const homeFor = (role) => ({ student: '/s', counselor: '/c', admin: '/a' }[role] || '/login');
export const ROLE_LABEL = { student: 'دانش‌آموز', counselor: 'مشاور', admin: 'مدیر' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading, null = signed out
  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);
  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);
  return <AuthCtx.Provider value={{ user, setUser, logout }}>{children}</AuthCtx.Provider>;
}

export function RequireRole({ role, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <div className="splash"><Loading label="" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
