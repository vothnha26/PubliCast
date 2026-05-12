import api from '../../api/axios';

export interface LoginPayload {
  email: string;
  password: string;
}

export const loginRequest = async (payload: LoginPayload) => {
  try {
    const res = await api.post('/auth/login', payload);
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

export const registerRequest = async (payload: any) => {
  try {
    const res = await api.post('/auth/register', payload);
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
