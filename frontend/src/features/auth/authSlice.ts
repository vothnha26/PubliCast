import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { loginRequest, registerRequest, verifyOTPRequest, resendOTPRequest } from './authAPI';

interface User { id?: string; name?: string; email?: string }

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  status: 'idle',
  error: null,
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

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
    },
  },
  extraReducers(builder) {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.user = action.payload?.user || null;
      })
      .addCase(login.rejected, (state, action: any) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error.message || 'Login failed';
      })

      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.user = action.payload?.user || null;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Register failed';
      })
      
      .addCase(verifyOTP.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        state.user = action.payload?.user || null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Verification failed';
      })

      .addCase(resendOTP.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(resendOTP.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(resendOTP.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Resend OTP failed';
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
