/**
 * Signup & Registration API
 * Handles two-step registration flow with DSpace backend
 */

import axiosInstance from "./axiosInstance";
import { fetchCsrfToken } from "./csrfApi";
import { siteConfig } from "@/config/siteConfig";

export interface SignupRequest {
  email: string;
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
  email?: string; // Email from token validation
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
  password: string; // Required for DSpace user creation
  phone?: string;
  organization?: string;
  department?: string;
  country?: string;
  language?: string;
  acceptTerms?: boolean;
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
 * POST /api/eperson/registrations?accountRequestType=register
 * DSpace API endpoint for user registration
 */
export const signup = async (data: SignupRequest): Promise<SignupResponse> => {
  try {
    const csrfToken = await fetchCsrfToken();
    if (!csrfToken) {
      return {
        status: "error",
        message: "CSRF token not available. Please try again.",
        code: "CSRF_ERROR",
      };
    }

    const response = await axiosInstance.post(
      "/api/eperson/registrations?accountRequestType=register",
      { email: data.email },
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
        },
        withCredentials: true,
      }
    );
    
    if (response.status === 201) {
      return {
        status: "success",
        message: "Registration initiated. Please check your email to activate your account.",
        data: {
          userId: "",
          email: data.email,
          status: "pending",
          tokenSent: true,
          expiresAt: "",
        },
      };
    }
    
    // Return success response
    return response.data;
  } catch (error: any) {
    console.error("Signup error:", error);
    
    // Handle specific HTTP error codes
    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data;
      
      // 409 Conflict - Email already exists
      if (status === 409) {
        return {
          status: "error",
          message: "This email is already registered",
          code: "EMAIL_EXISTS",
        };
      }
      
      // 400 Bad Request - Validation errors
      if (status === 400) {
        return {
          status: "error",
          message: "Invalid email address",
          code: "INVALID_EMAIL",
        };
      }
      
      // 422 Unprocessable Entity
      if (status === 422) {
        return {
          status: "error",
          message: "Email validation failed. Please use a valid email.",
          code: "VALIDATION_ERROR",
        };
      }
      
      // 500 Internal Server Error
      if (status === 500) {
        return {
          status: "error",
          message: "Server error. Please try again later.",
          code: "SERVER_ERROR",
        };
      }
      
      // Return the error response if available
      if (responseData) {
        return responseData;
      }
    }
    
    // Network or other errors
    return {
      status: "error",
      message: error.message || "Signup failed. Please check your connection.",
    };
  }
};

/**
 * Validate registration token before showing registration form
 * GET /api/eperson/registrations/search/findByToken?token={token}
 * DSpace API endpoint for token validation
 */
export const validateRegistrationToken = async (
  token: string
): Promise<TokenValidationResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/eperson/registrations/search/findByToken?token=${token}`
    );
    
    if (response.status === 200 && response.data && response.data.email) {
      return {
        status: "success",
        message: "Token is valid",
        email: response.data.email,
        data: {
          valid: true,
          email: response.data.email,
          userId: response.data.user || "",
          expiresAt: "",
        },
      };
    }
    
    return {
      status: "error",
      message: "Invalid token response",
      code: "INVALID_RESPONSE",
    };
  } catch (error: any) {
    console.error("Token validation error:", error);
    
    if (error.response) {
      const status = error.response.status;
      
      // 400 Bad Request - Invalid token format
      if (status === 400) {
        return {
          status: "error",
          message: "Invalid token format",
          code: "INVALID_TOKEN_FORMAT",
        };
      }
      
      // 404 Not Found - Token not found
      if (status === 404) {
        return {
          status: "error",
          message: "Invalid or expired token. Please sign up again.",
          code: "TOKEN_NOT_FOUND",
        };
      }
      
      // 422 Unprocessable Entity - Token expired
      if (status === 422) {
        return {
          status: "error",
          message: "Registration token has expired. Please sign up again.",
          code: "TOKEN_EXPIRED",
        };
      }
    }
    
    return {
      status: "error",
      message: "Invalid token or expired link. Please sign up again.",
      code: "TOKEN_ERROR",
    };
  }
};

/**
 * Step 2: Complete registration with additional profile information
 * POST /api/eperson/epersons?token={token}
 * DSpace API endpoint for creating user account
 */
export const completeRegistrationWithToken = async (
  token: string,
  data: CompleteRegistrationRequest
): Promise<CompleteRegistrationResponse> => {
  try {
    const csrfToken = await fetchCsrfToken();
    if (!csrfToken) {
      return {
        status: "error",
        message: "CSRF token not available. Please try again.",
        code: "CSRF_ERROR",
      };
    }

    // Get email from token validation first
    const tokenValidation = await validateRegistrationToken(token);
    if (tokenValidation.status !== "success" || !tokenValidation.data?.email) {
      return {
        status: "error",
        message: "Invalid or expired token",
        code: "INVALID_TOKEN",
      };
    }

    const email = tokenValidation.data.email;

    // Create user account with DSpace format
    const payload = {
      canLogIn: true,
      email: email,
      requireCertificate: false,
      password: data.password || "", // Password is required but not in CompleteRegistrationRequest
      metadata: {
        "eperson.firstname": [{ value: data.firstName }],
        "eperson.lastname": [{ value: data.lastName }],
        "eperson.phone": [{ value: data.phone || "" }],
        "eperson.language": [{ value: data.language || "en" }],
        "dspace.agreements.end-user": [{ value: "true" }],
      },
    };

    const response = await axiosInstance.post(
      `/api/eperson/epersons?token=${token}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
        },
        withCredentials: true,
      }
    );
    
    if (response.status === 201) {
      return {
        status: "success",
        message: "Account activated successfully! You can now login.",
        data: {
          userId: response.data.id || "",
          email: email,
          firstName: data.firstName,
          lastName: data.lastName,
          status: "active",
          createdAt: new Date().toISOString(),
          activatedAt: new Date().toISOString(),
        },
      };
    }
    
    return response.data;
  } catch (error: any) {
    console.error("Registration completion error:", error);
    
    if (error.response) {
      const status = error.response.status;
      
      // 400 Bad Request - Validation errors
      if (status === 400) {
        return {
          status: "error",
          message: "Invalid registration data. Please check all fields.",
          code: "VALIDATION_ERROR",
        };
      }
      
      // 401 Unauthorized
      if (status === 401) {
        return {
          status: "error",
          message: "Unauthorized. Please try signing up again.",
          code: "UNAUTHORIZED",
        };
      }
      
      // 403 Forbidden
      if (status === 403) {
        return {
          status: "error",
          message: "Access denied. Please contact support.",
          code: "FORBIDDEN",
        };
      }
      
      // 422 Unprocessable Entity - Token expired or already used
      if (status === 422) {
        return {
          status: "error",
          message: "Registration token has expired or already been used.",
          code: "TOKEN_EXPIRED",
        };
      }
      
      // 500 Internal Server Error
      if (status === 500) {
        return {
          status: "error",
          message: "Server error. Please try again later.",
          code: "SERVER_ERROR",
        };
      }
    }
    
    return {
      status: "error",
      message: "Registration failed. Please try again.",
    };
  }
};

/**
 * Resend activation email
 * POST /api/eperson/registrations?accountRequestType=register
 * Same endpoint as signup - DSpace will resend if email already exists
 */
export const resendActivationEmail = async (
  email: string
): Promise<ResendActivationResponse> => {
  try {
    const csrfToken = await fetchCsrfToken();
    if (!csrfToken) {
      return {
        status: "error",
        message: "CSRF token not available. Please try again.",
        code: "CSRF_ERROR",
      };
    }

    const response = await axiosInstance.post(
      "/api/eperson/registrations?accountRequestType=register",
      { email },
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
        },
        withCredentials: true,
      }
    );
    
    if (response.status === 201) {
      return {
        status: "success",
        message: "Activation email sent successfully. Please check your inbox.",
        data: {
          email: email,
          tokenSent: true,
          expiresAt: "",
        },
      };
    }
    
    return response.data;
  } catch (error: any) {
    console.error("Resend activation error:", error);
    
    if (error.response) {
      const status = error.response.status;
      
      // 400 Bad Request
      if (status === 400) {
        return {
          status: "error",
          message: "Invalid email address",
          code: "INVALID_EMAIL",
        };
      }
      
      // 404 Not Found - Email not found or already activated
      if (status === 404) {
        return {
          status: "error",
          message: "No pending registration found for this email",
          code: "NO_PENDING_REGISTRATION",
        };
      }
      
      // 429 Too Many Requests - Rate limiting
      if (status === 429) {
        return {
          status: "error",
          message: "Please wait before requesting another activation email",
          code: "RATE_LIMIT_EXCEEDED",
        };
      }
    }
    
    return {
      status: "error",
      message: "Failed to resend activation email. Please try again.",
    };
  }
};
