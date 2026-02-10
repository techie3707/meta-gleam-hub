# DSpace Registration Integration - Updated

## Overview

The signup and registration flow has been successfully updated to integrate with your **DSpace backend APIs** while maintaining the modern UI.

---

## Updated Flow

### Step 1: Email Signup (`/signUp`)

**User Action**: Enter email address only (no password required at this step)

**API Call**:
```
POST /api/eperson/registrations?accountRequestType=register
Body: { "email": "user@example.com" }
```

**Result**: 
- User receives activation email
- Email contains link: `http://localhost:4000/register/{token}`

---

### Step 2: Email Verification

**User Action**: Click activation link in email

**Link Format**: `/register/eae124876dba31dd22c7468b6749a172`

**API Call** (automatic on page load):
```
GET /api/eperson/registrations/search/findByToken?token={token}
```

**Result**:
- Token validated
- User email retrieved and pre-filled
- Registration form displayed

---

### Step 3: Complete Registration (`/register/{token}`)

**User Action**: Fill in registration details

**Form Fields**:
- ✅ **First Name** (required)
- ✅ **Last Name** (required)
- ✅ **Password** (required, 8+ chars with complexity rules)
- ✅ **Confirm Password** (required)
- ⚪ Phone Number (optional)
- ⚪ Organization (optional)
- ⚪ Department (optional)
- ⚪ Country (optional)
- ⚪ Language (optional, default: English)
- ✅ **Accept Terms** (required)

**API Call**:
```
POST /api/eperson/epersons?token={token}
Body: {
  "canLogIn": true,
  "email": "user@example.com",
  "requireCertificate": false,
  "password": "Password123!",
  "metadata": {
    "eperson.firstname": [{ "value": "John" }],
    "eperson.lastname": [{ "value": "Doe" }],
    "eperson.phone": [{ "value": "+1-234-567-8900" }],
    "eperson.language": [{ "value": "en" }],
    "dspace.agreements.end-user": [{ "value": "true" }]
  }
}
```

**Result**:
- User account created and activated
- Auto-login executed
- Redirected to dashboard (/)

---

### Step 4: Auto-Login

**Automatic Action**: After successful registration

**API Call**:
```
POST /api/authn/login
Body: { "user": "user@example.com", "password": "Password123!" }
```

**Result**:
- User automatically logged in
- Session established
- Redirected to home page

---

## API Endpoints Used

| Step | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| Signup | `/api/eperson/registrations?accountRequestType=register` | POST | Send activation email |
| Validate | `/api/eperson/registrations/search/findByToken?token={token}` | GET | Validate token & get email |
| Register | `/api/eperson/epersons?token={token}` | POST | Create user account |
| Login | `/api/authn/login` | POST | Auto-login after registration |
| Resend | `/api/eperson/registrations?accountRequestType=register` | POST | Resend activation email |

---

## Updated Files

### 1. `src/api/signupApi.ts`

**Changes**:
- ✅ Updated `signup()` to use DSpace registration endpoint
- ✅ Updated `validateRegistrationToken()` to use DSpace findByToken endpoint
- ✅ Updated `completeRegistrationWithToken()` to create DSpace user with metadata
- ✅ Updated `resendActivationEmail()` to use DSpace registration endpoint
- ✅ Added password field to `CompleteRegistrationRequest` interface
- ✅ Added CSRF token handling for all requests

**Key Integration Points**:
```typescript
// Signup - sends email only
await axiosInstance.post(
  "/api/eperson/registrations?accountRequestType=register",
  { email: data.email },
  { headers: { "X-XSRF-TOKEN": csrfToken } }
);

// Token validation - gets email
await axiosInstance.get(
  `/api/eperson/registrations/search/findByToken?token=${token}`
);

// Registration - creates user with DSpace metadata format
await axiosInstance.post(
  `/api/eperson/epersons?token=${token}`,
  {
    canLogIn: true,
    email: email,
    password: data.password,
    metadata: {
      "eperson.firstname": [{ value: data.firstName }],
      "eperson.lastname": [{ value: data.lastName }],
      // ... more metadata
    }
  }
);
```

---

### 2. `src/pages/SignUp.tsx`

**Changes**:
- ✅ Removed password and name fields (email only)
- ✅ Simplified form to single email input
- ✅ Updated to call DSpace registration endpoint
- ✅ Better error handling for email validation
- ✅ Modern UI with shadcn/ui components

**User Experience**:
1. User enters email address
2. Clicks "Continue" button
3. Sees success message: "Check your email"
4. Can resend email if needed

---

### 3. `src/pages/Register.tsx`

**Changes**:
- ✅ Added password and confirm password fields
- ✅ Added password visibility toggles
- ✅ Added password validation (8+ chars, complexity rules)
- ✅ Auto-login after successful registration
- ✅ Redirect to dashboard (/) instead of login page
- ✅ Token validation on page load
- ✅ Pre-filled email from token

**User Experience**:
1. Page loads, validates token
2. Email pre-filled (disabled)
3. User fills firstName, lastName, password
4. Optionally fills phone, organization, etc.
5. Accepts terms and conditions
6. Clicks "Complete Registration"
7. Account created → Auto-login → Redirect to dashboard

---

## Password Requirements

The registration form enforces the following password rules:

- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*...)

**Examples**:
- ✅ `Password123!`
- ✅ `SecureP@ss1`
- ❌ `password` (missing uppercase, number, special char)
- ❌ `Pass123` (too short, missing special char)

---

## Error Handling

### Signup Errors

| Error Code | HTTP Status | Message | Action |
|------------|-------------|---------|--------|
| EMAIL_EXISTS | 409 | Email already registered | Show login link |
| INVALID_EMAIL | 400 | Invalid email address | Fix email format |
| VALIDATION_ERROR | 422 | Email validation failed | Check email |
| CSRF_ERROR | - | CSRF token unavailable | Retry |
| SERVER_ERROR | 500 | Server error | Try again later |

### Registration Errors

| Error Code | HTTP Status | Message | Action |
|------------|-------------|---------|--------|
| INVALID_TOKEN | 404 | Invalid or expired token | Sign up again |
| TOKEN_EXPIRED | 422 | Token has expired | Request new activation email |
| VALIDATION_ERROR | 400 | Invalid registration data | Fix form fields |
| UNAUTHORIZED | 401 | Unauthorized access | Sign up again |
| FORBIDDEN | 403 | Access denied | Contact support |
| CSRF_ERROR | - | CSRF token unavailable | Retry |

---

## Testing the Flow

### Test Case 1: Successful Registration

```bash
# Step 1: Signup
1. Navigate to: http://localhost:4000/signUp
2. Enter email: test@example.com
3. Click "Continue"
4. ✓ Email sent message appears

# Step 2: Email verification
5. Check email inbox
6. Click activation link
7. ✓ Registration page loads

# Step 3: Complete registration
8. Form pre-filled with email
9. Fill:
   - First Name: John
   - Last Name: Doe
   - Password: Test@123456
   - Confirm Password: Test@123456
   - Accept Terms: ✓
10. Click "Complete Registration"
11. ✓ Account created
12. ✓ Auto-login successful
13. ✓ Redirected to dashboard

# Result: User is now logged in and on home page
```

---

### Test Case 2: Token Expired

```bash
1. Get activation link from email
2. Wait 24+ hours (or test with expired token)
3. Click activation link
4. ✓ Error: "Registration token has expired"
5. ✓ "Resend Activation Email" button shown
6. Click "Resend Activation Email"
7. ✓ New email sent
8. Click new activation link
9. ✓ Registration form loads
```

---

### Test Case 3: Password Validation

```bash
1. On registration page
2. Enter weak password: "weak"
3. ✓ Error: "Password must be at least 8 characters"
4. Enter: "password123"
5. ✓ Error: "Password must contain uppercase letter"
6. Enter: "Password123"
7. ✓ Error: "Password must contain special character"
8. Enter: "Password123!"
9. ✓ Password accepted
```

---

## Integration Checklist

- [x] DSpace registration endpoint integrated
- [x] DSpace token validation integrated
- [x] DSpace user creation with metadata
- [x] CSRF token handling
- [x] Auto-login after registration
- [x] Password complexity validation
- [x] Email-only signup flow
- [x] Token expiration handling
- [x] Resend activation email
- [x] Error handling for all scenarios
- [x] Modern UI with shadcn/ui
- [x] Responsive design
- [x] Password visibility toggles

---

## Production Deployment

### Backend Configuration

Ensure DSpace backend has:
- [x] SMTP server configured for email delivery
- [x] CORS enabled for frontend domain
- [x] Token expiration set (typically 24 hours)
- [x] Email templates configured
- [x] CSRF protection enabled

### Frontend Configuration

Update `src/config/siteConfig.ts`:
```typescript
export const siteConfig = {
  apiEndpoint: "http://your-dspace-server:8080/server",
  uiUrl: "http://your-frontend-domain:4000",
  // ... other config
};
```

---

## Support

### Files Modified
- `src/api/signupApi.ts` - API integration layer
- `src/pages/SignUp.tsx` - Email signup page
- `src/pages/Register.tsx` - Complete registration page

### API Documentation
- DSpace REST API: https://wiki.lyrasis.org/display/DSDOC7x/REST+API
- Registration Endpoint: `/api/eperson/registrations`
- User Creation: `/api/eperson/epersons`

---

## Summary

✅ **Complete integration with DSpace backend APIs**
✅ **Modern, responsive UI with shadcn/ui**
✅ **Email-only signup → Token validation → Complete registration with password**
✅ **Auto-login after successful registration**
✅ **Comprehensive error handling**
✅ **Password complexity validation**
✅ **Production-ready implementation**

The registration flow now seamlessly integrates with your DSpace backend while providing a modern, user-friendly experience!
