import api from '../../api/axios';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

const getApiErrorMessage = (error: any) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.errors?.[0]?.msg) {
    return error.response.data.errors[0].msg;
  }
  return null;
};

export const loginRequest = async (payload: LoginPayload) => {
  try {
    const res = await api.post('/auth/login', payload);
    return res.data;
  } catch (error: any) {
    const message = getApiErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
};

export const registerRequest = async (payload: any) => {
  try {
    const res = await api.post('/auth/register', payload);
    return res.data;
  } catch (error: any) {
    const message = getApiErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
};

export const forgotPasswordRequest = async (email: string) => {
  try {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  } catch (error: any) {
    const message = getApiErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
};

export interface EditProfilePayload {
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  bio?: string;
}

export const resetPasswordRequest = async (payload: ResetPasswordPayload) => {
  try {
    const res = await api.post('/auth/reset-password', payload);
    return res.data;
  } catch (error: any) {
    const message = getApiErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
};

export const editProfileRequest = async (payload: EditProfilePayload) => {
  try {
    const res = await api.put('/profile/edit', payload);
    return res.data;
  } catch (error: any) {
    const message = getApiErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
};

export const getUserProfileRequest = async () => {
  try {
    const res = await api.get('/user/profile');
    return res.data;
  } catch (error: any) {
    const message = getApiErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
};

export const uploadAvatarRequest = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error: any) {
    const message = getApiErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
};

export const verifyOTPRequest = async (payload: { email: string; otp: string }) => {
  try {
    const res = await api.post('/auth/verify-otp', payload);
    return res.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.response?.data?.errors?.[0]?.msg) {
      throw new Error(error.response.data.errors[0].msg);
    }
    throw error;
  }
};

export const resendOTPRequest = async (email: string) => {
  try {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};
