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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Library, Loader2, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  validateRegistrationToken,
  completeRegistrationWithToken,
  resendActivationEmail,
} from "@/api/signupApi";

const DEPARTMENTS = [
  "Research",
  "Administration",
  "Library",
  "IT",
  "Medical",
  "Engineering",
  "Education",
  "Other",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
];

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

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    organization: "",
    department: "",
    country: "",
    language: "en",
    acceptTerms: false,
  });

  useEffect(() => {
    if (token) {
      validateToken(token);
    } else {
      setValidating(false);
      setTokenError("No registration token provided");
    }
  }, [token]);

  const validateToken = async (t: string) => {
    setValidating(true);
    try {
      const result = await validateRegistrationToken(t);
      if (result.status === "success" && result.data?.valid) {
        setTokenValid(true);
        setFormData((prev) => ({
          ...prev,
          email: result.data!.email,
          firstName: result.data!.firstName || "",
          lastName: result.data!.lastName || "",
        }));
        setResendEmail(result.data!.email);
      } else {
        setTokenValid(false);
        setTokenError(result.message || "Invalid or expired token");
        setTokenErrorCode(result.code || "");
        if (result.data && "email" in result.data) {
          setResendEmail((result.data as any).email || "");
        }
      }
    } catch {
      setTokenError("Failed to validate token");
    } finally {
      setValidating(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName || formData.firstName.length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    } else if (formData.firstName.length > 50) {
      errors.firstName = "First name must be less than 50 characters";
    }

    if (!formData.lastName || formData.lastName.length < 2) {
      errors.lastName = "Last name must be at least 2 characters";
    } else if (formData.lastName.length > 50) {
      errors.lastName = "Last name must be less than 50 characters";
    }

    if (!formData.acceptTerms) {
      errors.acceptTerms = "You must accept the terms and conditions";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return;

    setLoading(true);
    try {
      const result = await completeRegistrationWithToken(token, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        organization: formData.organization || undefined,
        department: formData.department || undefined,
        country: formData.country || undefined,
        language: formData.language || undefined,
        acceptTerms: formData.acceptTerms,
      });

      if (result.status === "success") {
        setSuccess(true);
        toast({
          title: "Account activated!",
          description: "Your account has been activated successfully. You can now log in.",
        });
        // Auto-redirect after 3 seconds
        setTimeout(() => navigate("/login"), 3000);
      } else if (result.errors) {
        const errors: Record<string, string> = {};
        result.errors.forEach((err) => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);
      } else {
        toast({
          title: "Error",
          description: result.message || "Registration failed",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!resendEmail) return;
    setResending(true);
    try {
      const result = await resendActivationEmail(resendEmail);
      toast({
        title: result.status === "success" ? "Email sent" : "Error",
        description: result.message,
        variant: result.status === "success" ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Error", description: "Failed to resend", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validating your activation link...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center animate-slide-up">
          <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Account Activated!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your account has been activated successfully. You will be redirected to the login page shortly.
            </p>
            <Link to="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center animate-slide-up">
          <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {tokenErrorCode === "TOKEN_EXPIRED"
                ? "Activation Link Expired"
                : "Invalid Activation Link"}
            </h2>
            <p className="text-muted-foreground mb-6">{tokenError}</p>
            <div className="flex flex-col gap-3">
              {resendEmail && (
                <Button
                  variant="outline"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    "Resend Activation Email"
                  )}
                </Button>
              )}
              <Link to="/signUp">
                <Button variant="ghost" className="w-full">
                  Sign up again
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  Back to login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Library className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Complete Your Registration
          </h1>
          <p className="text-muted-foreground mt-2">
            Step 2 of 2 — Profile Information
          </p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Verified Email */}
            <div className="space-y-2">
              <Label>Email Address (Verified)</Label>
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/50 border border-input">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm text-foreground">{formData.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Email is verified and cannot be changed
              </p>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="bg-secondary/50"
              />
              {fieldErrors.firstName && (
                <p className="text-destructive text-sm">{fieldErrors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="bg-secondary/50"
              />
              {fieldErrors.lastName && (
                <p className="text-destructive text-sm">{fieldErrors.lastName}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1-234-567-8900"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="bg-secondary/50"
              />
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                placeholder="MEDANTA Hospital"
                value={formData.organization}
                onChange={(e) =>
                  setFormData({ ...formData, organization: e.target.value })
                }
                className="bg-secondary/50"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) =>
                  setFormData({ ...formData, department: value })
                }
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="United States"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="bg-secondary/50"
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Language Preference</Label>
              <Select
                value={formData.language}
                onValueChange={(value) =>
                  setFormData({ ...formData, language: value })
                }
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Accept Terms */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, acceptTerms: checked as boolean })
                  }
                />
                <label
                  htmlFor="acceptTerms"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  I accept the Terms and Conditions *
                </label>
              </div>
              {fieldErrors.acceptTerms && (
                <p className="text-destructive text-sm">{fieldErrors.acceptTerms}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing registration...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
