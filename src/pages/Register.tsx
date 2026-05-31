/**
 * Registration Page - Step 2 of Registration
 * Token-based: /register/:token
 * Validates token, shows profile form, completes registration
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Library, Loader2, CheckCircle, AlertCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  validateRegistrationToken,
  completeRegistrationWithToken,
  resendActivationEmail,
} from "@/api/signupApi";
import { authLogin } from "@/api/authApi";

const Register = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [tokenErrorCode, setTokenErrorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  // Validate registration token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setTokenError("No registration token provided");
        setValidating(false);
        return;
      }

      try {
        const result = await validateRegistrationToken(token);

        if (result.status === "success" && result.email) {
          setTokenValid(true);
          setResendEmail(result.email);
        } else if (result.email) {
          // Even if status is not "success", if we have an email, the token is valid
          setTokenValid(true);
          setResendEmail(result.email);
        } else {
          setTokenValid(false);
          setTokenError(result.message || "Invalid or expired token");
          setTokenErrorCode(result.code || "UNKNOWN");
        }
      } catch (error: any) {
        setTokenValid(false);
        setTokenError(error.response?.data?.message || "Failed to validate token");
        setTokenErrorCode(error.response?.data?.code || "UNKNOWN");
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.phone.trim()) errors.phone = "Phone number is required";

    // Phone validation
    if (formData.phone && !/^\+?[\d\s\-()]+$/.test(formData.phone)) {
      errors.phone = "Invalid phone number format";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({
        title: "Error",
        description: "No registration token found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await completeRegistrationWithToken(token, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        phone: formData.phone,
      });

      if (result.status === "success") {
        toast({
          title: "Registration successful!",
          description: "Logging you in...",
        });
        
        // Auto-login after successful registration
        try {
          await authLogin(resendEmail, formData.password);
          setSuccess(true);
          
          // Redirect to home page after 2 seconds
          setTimeout(() => {
            navigate("/");
          }, 2000);
        } catch (loginError) {
          // If auto-login fails, still show success and redirect to login
          setSuccess(true);
          toast({
            title: "Registration successful!",
            description: "Please login with your credentials.",
          });
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        }
      } else {
        toast({
          title: "Registration failed",
          description: result.message || "Failed to complete registration",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.response?.data?.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!resendEmail) {
      toast({
        title: "Error",
        description: "No email address found for resending",
        variant: "destructive",
      });
      return;
    }

    setResending(true);
    try {
      await resendActivationEmail(resendEmail);
      toast({
        title: "Email resent",
        description: "Check your inbox for the new activation link",
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend email",
        description: error.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validating registration token...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">Registration Complete!</h2>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
          <Link to="/">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error state - Invalid token
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl shadow-lg border">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Invalid Registration Link</h2>
            <p className="text-muted-foreground">{tokenError}</p>

            {tokenErrorCode === "TOKEN_EXPIRED" && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your registration link has expired. Would you like us to send a new one?
                </p>
                <Button
                  onClick={handleResendEmail}
                  disabled={resending || !resendEmail}
                  className="w-full"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    "Resend activation email"
                  )}
                </Button>
              </div>
            )}

            <Link to="/signup">
              <Button variant="outline" className="w-full mt-4">
                Back to signup
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-2xl space-y-8 animate-slide-up">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Library className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">User Registration</h1>
          <p className="text-muted-foreground mt-2">
            Fill in your details to activate your account
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card p-8 rounded-xl shadow-lg border">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className={fieldErrors.firstName ? "border-destructive" : ""}
                  placeholder="John"
                  required
                  autoComplete="given-name"
                />
                {fieldErrors.firstName && (
                  <p className="text-sm text-destructive">{fieldErrors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className={fieldErrors.lastName ? "border-destructive" : ""}
                  placeholder="Doe"
                  required
                  autoComplete="family-name"
                />
                {fieldErrors.lastName && (
                  <p className="text-sm text-destructive">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email (disabled) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={resendEmail}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className={fieldErrors.phone ? "border-destructive" : ""}
                placeholder="+1 234 567 8900"
                required
                autoComplete="tel"
              />
              {fieldErrors.phone && (
                <p className="text-sm text-destructive">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={fieldErrors.password ? "border-destructive pr-10" : "pr-10"}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className={fieldErrors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Password requirements:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>At least 8 characters long</li>
                <li>Passwords must match</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
