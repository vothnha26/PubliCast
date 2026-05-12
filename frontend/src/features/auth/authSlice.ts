import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  forgotPasswordRequest,
  loginRequest,
  registerRequest,
  resendOTPRequest,
  resetPasswordRequest,
  ResetPasswordPayload,
  verifyOTPRequest
} from './authAPI';

interface User { id?: string; name?: string; email?: string }

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string | null;
  message?: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  status: 'idle',
  error: null,
  message: null,
};

export const login = createAsyncThunk('auth/login', async (payload: { email: string; password: string }, thunkAPI) => {
  const data = await loginRequest(payload);
  return data;
});

export const register = createAsyncThunk('auth/register', async (payload: any) => {
  const data = await registerRequest(payload);
  return data;
});

export const verifyOTP = createAsyncThunk('auth/verifyOTP', async (payload: { email: string; otp: string }) => {
  const data = await verifyOTPRequest(payload);
  return data;
});

export const resendOTP = createAsyncThunk('auth/resendOTP', async (email: string) => {
  const data = await resendOTPRequest(email);
  return data;
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email: string) => {
  const data = await forgotPasswordRequest(email);
  return data;
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async (payload: ResetPasswordPayload) => {
  const data = await resetPasswordRequest(payload);
  return data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      state.message = null;
    },
    clearAuthFeedback(state) {
      state.error = null;
      state.message = null;
      if (state.status !== 'loading') {
        state.status = 'idle';
      }
    },
    setAuthError(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
      state.message = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.message = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.user = action.payload?.user || null;
        state.message = action.payload?.message || null;
      })
      .addCase(login.rejected, (state, action: any) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error.message || 'Login failed';
        state.message = null;
      })

      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.message = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.user = action.payload?.user || null;
        state.message = action.payload?.message || null;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Register failed';
        state.message = null;
      })
      
      .addCase(verifyOTP.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.message = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.user = action.payload?.user || null;
        state.message = action.payload?.message || null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Verification failed';
        state.message = null;
      })

      .addCase(resendOTP.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.message = null;
      })
      .addCase(resendOTP.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.message = action.payload?.message || 'OTP sent successfully';
      })
      .addCase(resendOTP.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Resend OTP failed';
        state.message = null;
      })

      .addCase(forgotPassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.message = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.message = action.payload?.message || 'If the email exists, an OTP has been sent.';
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Forgot password request failed';
        state.message = null;
      })

      .addCase(resetPassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.message = null;
      })
      .addCase(resetPassword.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.message = action.payload?.message || 'Password reset successfully';
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Password reset failed';
        state.message = null;
      });
  },
});

export const { clearAuthFeedback, logout, setAuthError } = authSlice.actions;
export default authSlice.reducer;
