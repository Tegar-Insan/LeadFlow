// src/context/AuthContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  clearAuthStorage,
} from '../utils/tokenHelper.js';
import {
  loginUser,
  registerInitiate,
  registerVerifyOTP,
  logoutUser,
  getMe,
} from '../services/authService.js';

const AuthContext = createContext(null);

const initialState = {
  user:            getStoredUser(),
  token:           getAccessToken(),
  isAuthenticated: !!getAccessToken(),
  isLoading:       false,
  otpPending:      false,
  otpEmail:        null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user:            action.payload.user,
        token:           action.payload.accessToken,
        isAuthenticated: true,
        isLoading:       false,
      };
    case 'OTP_PENDING':
      return {
        ...state,
        otpPending: true,
        otpEmail:   action.payload,
        isLoading:  false,
      };
    // Registration OTP confirmed — clear pending state but do NOT log in.
    // User must proceed to /login and authenticate explicitly.
    case 'OTP_VERIFIED_REGISTER':
      return {
        ...state,
        user:            null,
        token:           null,
        isAuthenticated: false,
        otpPending:      false,
        otpEmail:        null,
        isLoading:       false,
      };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    case 'LOGOUT':
      return {
        user:            null,
        token:           null,
        isAuthenticated: false,
        isLoading:       false,
        otpPending:      false,
        otpEmail:        null,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Sync token to localStorage
  useEffect(() => {
    if (state.token) {
      setAccessToken(state.token);
    } else {
      removeAccessToken();
    }
  }, [state.token]);

  // Sync user to localStorage
  useEffect(() => {
    if (state.user) {
      setStoredUser(state.user);
    } else {
      removeStoredUser();
    }
  }, [state.user]);

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await loginUser({ email, password });
      if (res.data?.otpRequired) {
        dispatch({ type: 'OTP_PENDING', payload: email });
        return { otpRequired: true };
      }
      setAccessToken(res.data.accessToken);
      setStoredUser(res.data.user);
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });

      // Return fresh role path so LoginPage doesn't rely on stale closure
      const role = res.data.user?.role_name || res.data.user?.roleName;
      const redirectTo =
        role === 'admin'           ? '/admin'    :
        role === 'business_owner'  ? '/calendar' :
                                     '/calendar';
      return { success: true, redirectTo };
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  };

  const verifyOTP = async (email, otp) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Verify the registration OTP — discard any returned token.
      // The user must log in explicitly; we must NOT auto-authenticate here
      // or GuestRoute will redirect /login → /calendar before they can sign in.
      await registerVerifyOTP({ email, otp });
      dispatch({ type: 'OTP_VERIFIED_REGISTER' });
      return { success: true };
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  };

  const register = async (data) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await registerInitiate(data);
      dispatch({ type: 'OTP_PENDING', payload: data.email });
      dispatch({ type: 'SET_LOADING', payload: false });
      return res.data;
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      clearAuthStorage();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateUser = (user) => {
    setStoredUser(user);
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  // Role-based dashboard redirect path
  const dashboardPath = (() => {
    const role = state.user?.role_name || state.user?.roleName;
    if (role === 'admin')           return '/admin';
    if (role === 'business_owner')  return '/calendar';
    if (role === 'marketing_staff') return '/calendar';
    return '/calendar';
  })();

  return (
    <AuthContext.Provider
      value={{
        ...state,
        dashboardPath,
        login,
        verifyOTP,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Named export — used by useAuth.js
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

export const useAuthContext = useAuth;

export default AuthContext;