# Signup & Registration Testing Guide

## Prerequisites

- ✅ Backend server running on `http://localhost:8080`
- ✅ Frontend server running on `http://localhost:4000`
- ✅ SMTP configured for email delivery
- ✅ Database accessible

---

## Test Case 1: Successful Complete Registration

### Steps

1. **Open Signup Page**
   ```
   Navigate to: http://localhost:4000/signUp
   ```

2. **Fill Signup Form**
   ```
   Email: test.user@example.com
   Password: Test@123456
   Confirm Password: Test@123456
   First Name: John
   Last Name: Doe
   ```

3. **Submit Form**
   - Click "Sign Up" button
   - **Expected**: Loading spinner appears
   - **Expected**: Form submission successful
   - **Expected**: Success message displayed: "Please check your email to activate your account"

4. **Verify Email Sent**
   - Check email inbox for `test.user@example.com`
   - **Expected**: Email received within 1 minute
   - **Expected**: Subject: "MEDANTA - Activate Your Account"
   - **Expected**: Email contains activation link

5. **Click Activation Link**
   - Click the "Activate My Account" button in email
   - **Expected**: Browser opens `http://localhost:4000/register/{token}`
   - **Expected**: Token validation loading screen appears

6. **Verify Registration Form Loads**
   - **Expected**: Form loads successfully
   - **Expected**: Email field pre-filled: `test.user@example.com`
   - **Expected**: Email field disabled with verified indicator
   - **Expected**: First Name and Last Name pre-filled: "John" and "Doe"

7. **Fill Registration Form**
   ```
   First Name: John (pre-filled)
   Last Name: Doe (pre-filled)
   Phone: +1-234-567-8900
   Organization: Test Company
   Department: IT
   Country: United States
   Language: English
   Accept Terms: ✓ (checked)
   ```

8. **Submit Registration**
   - Click "Complete Registration" button
   - **Expected**: Loading spinner appears
   - **Expected**: Success message: "Account activated successfully!"
   - **Expected**: Auto-redirect countdown shown
   - **Expected**: Redirected to `/login` after 3 seconds

9. **Login**
   ```
   Navigate to: http://localhost:4000/login
   Email: test.user@example.com
   Password: Test@123456
   ```
   - Click "Login" button
   - **Expected**: Login successful
   - **Expected**: Redirected to dashboard/home page

**✅ TEST PASSED** if all steps complete successfully

---

## Test Case 2: Email Already Exists

### Steps

1. Navigate to `http://localhost:4000/signUp`
2. Fill form with existing email:
   ```
   Email: existing@example.com
   Password: Test@123456
   Confirm Password: Test@123456
   ```
3. Submit form
4. **Expected**: Error message displayed
5. **Expected**: Email field shows error: "This email is already registered"
6. **Expected**: Toast notification: "Email already exists. Please login instead."

**✅ TEST PASSED** if error properly displayed

---

## Test Case 3: Password Validation

### Test 3.1: Weak Password

1. Navigate to signup page
2. Enter password: `weak`
3. **Expected**: Error: "Password must be at least 8 characters"
4. **Expected**: Password strength: "Weak"

### Test 3.2: No Uppercase

1. Enter password: `test@123456`
2. **Expected**: Error: "Password must contain at least one uppercase letter"

### Test 3.3: No Number

1. Enter password: `Test@password`
2. **Expected**: Error: "Password must contain at least one number"

### Test 3.4: No Special Character

1. Enter password: `Test123456`
2. **Expected**: Error: "Password must contain at least one special character"

### Test 3.5: Password Mismatch

1. Enter password: `Test@123456`
2. Enter confirm: `Test@654321`
3. **Expected**: Error: "Passwords do not match"

**✅ TEST PASSED** if all validations work correctly

---

## Test Case 4: Token Expiration

### Steps

1. Complete signup process
2. **Do not** click activation link for 24+ hours
3. After 24 hours, click activation link
4. **Expected**: Error page displayed
5. **Expected**: Message: "Activation Link Expired"
6. **Expected**: Explanation: "Links are valid for 24 hours"
7. **Expected**: "Resend Activation Email" button available
8. Click "Resend Activation Email"
9. **Expected**: New email sent
10. **Expected**: Toast: "Activation email sent successfully"
11. Click new activation link
12. **Expected**: Registration form loads successfully

**✅ TEST PASSED** if expired token handled properly

---

## Test Case 5: Invalid Token

### Steps

1. Navigate to: `http://localhost:4000/register/invalid-token-12345`
2. **Expected**: Error page displayed
3. **Expected**: Message: "Invalid Activation Link"
4. **Expected**: Options: "Sign up again" and "Back to login"

**✅ TEST PASSED** if invalid token handled

---

## Test Case 6: Registration Form Validation

### Test 6.1: Missing First Name

1. Complete signup and click activation link
2. Leave First Name empty
3. Fill other required fields
4. Submit form
5. **Expected**: Error: "First name must be at least 2 characters"

### Test 6.2: Name Too Short

1. First Name: `A`
2. Submit
3. **Expected**: Error: "First name must be at least 2 characters"

### Test 6.3: Name with Numbers

1. First Name: `John123`
2. Submit
3. **Expected**: Error: "First name can only contain letters and spaces"

### Test 6.4: Invalid Phone

1. Phone: `abc-def-ghij`
2. Submit
3. **Expected**: Error: "Please enter a valid phone number"

### Test 6.5: Terms Not Accepted

1. Fill all fields
2. Leave "Accept Terms" unchecked
3. Submit
4. **Expected**: Error: "You must accept the terms and conditions"

**✅ TEST PASSED** if all validations work

---

## Test Case 7: Account Already Activated

### Steps

1. Complete full registration flow
2. Account activated successfully
3. Try clicking activation link again (from same email)
4. **Expected**: Message: "This account has already been activated"
5. **Expected**: Auto-redirect to login page after 2 seconds

**✅ TEST PASSED** if already activated handled

---

## Test Case 8: Resend Activation Email

### Steps

1. Complete signup process
2. On success screen, click "Resend activation email"
3. **Expected**: Loading state on button
4. **Expected**: Toast: "Activation email sent successfully"
5. Check email inbox
6. **Expected**: New activation email received
7. **Expected**: New token in activation link

**✅ TEST PASSED** if resend works

---

## Test Case 9: Network Error Handling

### Steps

1. Stop backend server
2. Try to submit signup form
3. **Expected**: Error message displayed
4. **Expected**: Toast: "Signup failed. Please check your connection."
5. **Expected**: Form data preserved (not cleared)
6. Start backend server
7. Try submitting again
8. **Expected**: Submission successful

**✅ TEST PASSED** if network errors handled gracefully

---

## Test Case 10: UI/UX Features

### Test 10.1: Password Visibility Toggle

1. Enter password in password field
2. Click eye icon
3. **Expected**: Password becomes visible
4. Click eye icon again
5. **Expected**: Password hidden

### Test 10.2: Password Strength Indicator

1. Enter password: `weak`
2. **Expected**: Red bar, "Weak" label
3. Enter password: `Test123`
4. **Expected**: Yellow bar, "Medium" label
5. Enter password: `Test@123456`
6. **Expected**: Green bar, "Strong" label

### Test 10.3: Password Match Indicator

1. Enter password: `Test@123456`
2. Enter same in confirm password
3. **Expected**: Green checkmark with "Passwords match"

### Test 10.4: Loading States

1. Submit any form
2. **Expected**: Button shows loading spinner
3. **Expected**: Button text changes to "Creating account..." or "Completing registration..."
4. **Expected**: Button disabled during submission

### Test 10.5: Auto-focus

1. Open signup page
2. **Expected**: Email field automatically focused
3. Open registration page
4. **Expected**: First Name field automatically focused (if not pre-filled)

**✅ TEST PASSED** if all UI features work

---

## Test Case 11: Dropdown Selections

### Test 11.1: Department Dropdown

1. On registration page, click Department dropdown
2. **Expected**: List of departments shown (Research, IT, Library, etc.)
3. Select "IT"
4. **Expected**: "IT" selected and displayed

### Test 11.2: Country Dropdown

1. Click Country dropdown
2. **Expected**: List of 30+ countries
3. Select "United States"
4. **Expected**: "United States" selected

### Test 11.3: Language Dropdown

1. Click Language dropdown
2. **Expected**: List of 10+ languages
3. Select "English"
4. **Expected**: "English" selected

**✅ TEST PASSED** if dropdowns work properly

---

## Test Case 12: Responsive Design

### Steps

1. Open signup page on desktop (1920x1080)
2. **Expected**: Form centered, proper spacing
3. Resize to tablet (768x1024)
4. **Expected**: Form adjusts, still usable
5. Resize to mobile (375x667)
6. **Expected**: Form stacks vertically, buttons full width
7. Test all interactions on mobile
8. **Expected**: All features work on mobile

**✅ TEST PASSED** if responsive on all screen sizes

---

## Performance Test

### Load Time Test

1. Open signup page
2. **Expected**: Page loads < 2 seconds
3. Open registration page (with valid token)
4. **Expected**: Token validation < 1 second
5. **Expected**: Form displayed < 2 seconds total

**✅ TEST PASSED** if pages load quickly

---

## Accessibility Test

### Keyboard Navigation

1. Open signup page
2. Use only Tab key to navigate
3. **Expected**: Can reach all form fields
4. **Expected**: Can reach submit button
5. **Expected**: Focus indicators visible
6. Press Enter on submit button
7. **Expected**: Form submits

### Screen Reader

1. Use screen reader (NVDA/JAWS)
2. **Expected**: All labels read correctly
3. **Expected**: Error messages announced
4. **Expected**: Required fields indicated

**✅ TEST PASSED** if accessible

---

## Cross-Browser Test

### Browsers to Test

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### For Each Browser

1. Complete full registration flow
2. **Expected**: All features work identically
3. **Expected**: UI renders correctly
4. **Expected**: No console errors

**✅ TEST PASSED** if works in all browsers

---

## API Response Test

### Test API Endpoints Directly

#### 1. Test Signup API

```bash
curl -X POST http://localhost:8080/server/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api.test@example.com",
    "password": "Test@123456",
    "firstName": "API",
    "lastName": "Test"
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Registration initiated...",
  "data": {
    "userId": "...",
    "email": "api.test@example.com",
    "status": "pending",
    "tokenSent": true
  }
}
```

#### 2. Test Token Validation

```bash
curl http://localhost:8080/server/api/auth/register/validate/{token}
```

**Expected**: 200 OK with valid token data

#### 3. Test Registration Completion

```bash
curl -X POST http://localhost:8080/server/api/auth/register/{token} \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "API",
    "lastName": "Test",
    "acceptTerms": true
  }'
```

**Expected**: 200 OK with activation confirmation

**✅ TEST PASSED** if all API calls return expected responses

---

## Summary Checklist

- [ ] Test Case 1: Successful Complete Registration
- [ ] Test Case 2: Email Already Exists
- [ ] Test Case 3: Password Validation
- [ ] Test Case 4: Token Expiration
- [ ] Test Case 5: Invalid Token
- [ ] Test Case 6: Registration Form Validation
- [ ] Test Case 7: Account Already Activated
- [ ] Test Case 8: Resend Activation Email
- [ ] Test Case 9: Network Error Handling
- [ ] Test Case 10: UI/UX Features
- [ ] Test Case 11: Dropdown Selections
- [ ] Test Case 12: Responsive Design
- [ ] Performance Test
- [ ] Accessibility Test
- [ ] Cross-Browser Test
- [ ] API Response Test

---

## Bug Reporting Template

If you find any issues, report using this template:

```
**Test Case**: [Name]
**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Result**: ...

**Actual Result**: ...

**Browser**: [Chrome/Firefox/Safari/Edge] Version X
**Screenshot**: [if applicable]
**Console Errors**: [if any]
```

---

## Testing Tips

1. **Clear Browser Cache**: Between tests to avoid cached data
2. **Use Different Emails**: For each test to avoid conflicts
3. **Check Network Tab**: In DevTools to see API calls
4. **Check Console**: For JavaScript errors
5. **Test on Clean State**: Clear localStorage before testing
6. **Document Issues**: Take screenshots of any problems
7. **Test Edge Cases**: Try unusual inputs
8. **Test Slow Network**: Simulate slow connections

---

## Test Data

### Valid Test Emails
```
test1@example.com
test2@example.com
john.doe@test.com
jane.smith@test.com
```

### Valid Test Passwords
```
Test@123456
Secure@Pass1
Strong@Pass2
Valid@12345
```

### Valid Phone Numbers
```
+1-234-567-8900
(555) 123-4567
+44 20 1234 5678
+91 98765 43210
```

---

**Remember**: Test in both light and dark mode if your app supports theme switching!
