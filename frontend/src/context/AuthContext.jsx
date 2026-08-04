import { useState } from 'react';
import { registerRequest, loginRequest } from '../api/authApi';
import { AuthContext } from './auth-context';

const STORAGE_KEY = 'fplAuth';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStored);

  function persist(next) {
    setAuth(next);
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function register(email, password) {
    const { token, user } = await registerRequest(email, password);
    persist({ token, user });
  }

  async function login(email, password) {
    const { token, user } = await loginRequest(email, password);
    persist({ token, user });
  }

  function logout() {
    persist(null);
  }

  const value = {
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    isAuthed: !!auth?.token,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
