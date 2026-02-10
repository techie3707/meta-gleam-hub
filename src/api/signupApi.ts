/**
 * Signup & Registration API
 * Handles two-step registration flow per documentation
 */

import axiosInstance from "./axiosInstance";

export interface SignupRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SignupResponse {
  status: string;
  message: string;
  data?: {
    userId: string;
    email: string;
    status: string;
    tokenSent: boolean;
    expiresAt: string;
  };
  errors?: Array<{ field: string; message: string }>;
  code?: string;
}

export interface TokenValidationResponse {
  status: string;
  message: string;
  data?: {
    valid: boolean;
    email: string;
    userId: string;
    expiresAt: string;
    firstName?: string;
    lastName?: string;
  };
  code?: string;
}

export interface CompleteRegistrationRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  organization?: string;
  department?: string;
  country?: string;
  language?: string;
  acceptTerms: boolean;
}

export interface CompleteRegistrationResponse {
  status: string;
  message: string;
  data?: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: string;
    activatedAt: string;
  };
  errors?: Array<{ field: string; message: string }>;
  code?: string;
}

export interface ResendActivationResponse {
  status: string;
  message: string;
  data?: {
    email: string;
    tokenSent: boolean;
    expiresAt: string;
    retryAfter?: number;
  };
  code?: string;
}

/**
 * Step 1: Initial signup - create pending user and send verification email
 * POST /api/auth/signup
 */
export const signup = async (data: SignupRequest): Promise<SignupResponse> => {
  try {
    const response = await axiosInstance.post("/api/auth/signup", {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { status: "error", message: error.message || "Signup failed" };
  }
};

/**
 * Validate registration token before showing registration form
 * GET /api/auth/register/validate/{token}
 */
export const validateRegistrationToken = async (
  token: string
): Promise<TokenValidationResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/auth/register/validate/${token}`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { status: "error", message: "Token validation failed" };
  }
};

/**
 * Step 2: Complete registration with additional profile information
 * POST /api/auth/register/{token}
 */
export const completeRegistrationWithToken = async (
  token: string,
  data: CompleteRegistrationRequest
): Promise<CompleteRegistrationResponse> => {
  try {
    const response = await axiosInstance.post(
      `/api/auth/register/${token}`,
      data
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { status: "error", message: "Registration failed" };
  }
};

/**
 * Resend activation email
 * POST /api/auth/resend-activation
 */
export const resendActivationEmail = async (
  email: string
): Promise<ResendActivationResponse> => {
  try {
    const response = await axiosInstance.post("/api/auth/resend-activation", {
      email,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { status: "error", message: "Failed to resend activation email" };
  }
};
