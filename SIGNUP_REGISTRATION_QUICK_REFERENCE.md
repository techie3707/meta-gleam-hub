# Signup & Registration - Quick Reference

## URLs

- **Signup Page**: http://localhost:4000/signUp
- **Registration Page**: http://localhost:4000/register/:token
- **Login Page**: http://localhost:4000/login

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/signup` | Create pending user |
| GET | `/api/auth/register/validate/{token}` | Validate token |
| POST | `/api/auth/register/{token}` | Complete registration |
| POST | `/api/auth/resend-activation` | Resend activation email |

---

## Form Fields

### Signup Form (/signUp)
- ✅ **Email** (required)
- ✅ **Password** (required, 8+ chars)
- ✅ **Confirm Password** (required)
- ⚪ First Name (optional)
- ⚪ Last Name (optional)

### Registration Form (/register/:token)
- 🔒 **Email** (pre-filled, disabled)
- ✅ **First Name** (required, 2-50 chars)
- ✅ **Last Name** (required, 2-50 chars)
- ⚪ Phone Number (optional)
- ⚪ Organization (optional)
- ⚪ Department (optional, dropdown)
- ⚪ Country (optional, dropdown)
- ⚪ Language (optional, dropdown)
- ✅ **Accept Terms** (required, checkbox)

---

## Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*...)

**Examples**:
- ✅ `Password123!`
- ✅ `SecureP@ss1`
- ❌ `password` (no uppercase, number, special char)
- ❌ `Pass123` (too short)

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `EMAIL_EXISTS` | Email already registered | Use different email or login |
| `TOKEN_EXPIRED` | Activation link expired | Resend activation email |
| `INVALID_TOKEN` | Token not found/invalid | Sign up again |
| `ACCOUNT_ALREADY_ACTIVE` | Already activated | Go to login page |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait before retrying |

---

## Registration Flow

```
1. User → /signUp
2. Submit form → Email sent
3. Check inbox → Click activation link
4. User → /register/{token}
5. Fill profile → Submit
6. Account activated → Auto-redirect to /login
7. Login with credentials ✓
```

---

## Testing Quick Steps

### Test Successful Registration

```bash
1. Go to: http://localhost:4000/signUp
2. Fill form:
   Email: test@example.com
   Password: Test123!@
   Confirm: Test123!@
3. Click "Sign Up"
4. Check email for activation link
5. Click activation link
6. Fill registration form:
   First Name: John
   Last Name: Doe
   Accept Terms: ✓
7. Click "Complete Registration"
8. Redirected to login
9. Login with credentials
```

### Test Error Scenarios

```bash
# Email already exists
1. Use existing email → Error: "Email already registered"

# Weak password
1. Use "pass123" → Error: "Password must contain uppercase..."

# Password mismatch
1. Different passwords → Error: "Passwords do not match"

# Expired token
1. Wait > 24 hours → Error: "Activation link expired"

# Missing required fields
1. Skip first name → Error: "First name is required"

# Without accepting terms
1. Don't check terms → Error: "You must accept terms"
```

---

## Common Issues & Solutions

### Issue: Email not received
**Solutions**:
1. Check spam folder
2. Verify SMTP configuration
3. Click "Resend activation email"
4. Check email address spelling

### Issue: Token expired
**Solutions**:
1. Click "Resend Activation Email"
2. Or sign up again with same email

### Issue: Invalid token
**Solutions**:
1. Ensure full URL is copied
2. Check for line breaks in URL
3. Sign up again if needed

### Issue: Password rejected
**Solutions**:
1. Ensure 8+ characters
2. Include uppercase letter
3. Include lowercase letter
4. Include number
5. Include special character

---

## Development

### Files to Modify

**UI Changes**:
- `src/pages/SignUp.tsx`
- `src/pages/Register.tsx`

**API Changes**:
- `src/api/signupApi.ts`

**Config**:
- `src/config/siteConfig.ts`

**Routes**:
- `src/App.tsx`

### Adding Countries

Edit `src/pages/Register.tsx`:
```typescript
const COUNTRIES = [
  { value: "XX", label: "Country Name" },
  // Add more...
];
```

### Adding Languages

Edit `src/pages/Register.tsx`:
```typescript
const LANGUAGES = [
  { value: "xx", label: "Language Name" },
  // Add more...
];
```

---

## Production Checklist

- [ ] Update API endpoint in siteConfig.ts
- [ ] Configure SMTP server
- [ ] Enable HTTPS
- [ ] Test email delivery
- [ ] Set proper token expiration
- [ ] Configure rate limiting
- [ ] Add reCAPTCHA (optional)
- [ ] Monitor error rates
- [ ] Set up logging

---

## Support

**Documentation**: `SIGNUP_REGISTRATION_IMPLEMENTATION.md`

**Code Files**:
- SignUp: `src/pages/SignUp.tsx`
- Register: `src/pages/Register.tsx`
- API: `src/api/signupApi.ts`
