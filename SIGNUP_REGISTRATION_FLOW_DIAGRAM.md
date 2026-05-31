# User Signup & Registration Flow - Visual Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    USER SIGNUP & REGISTRATION FLOW                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                           STEP 1: INITIAL SIGNUP                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

    ┌──────────────┐
    │    User      │
    └──────┬───────┘
           │
           │ Navigates to
           ↓
    ┌─────────────────────────────────────────┐
    │      Signup Page (/signUp)              │
    │                                         │
    │  ┌─────────────────────────────────┐   │
    │  │  Email: _________________        │   │
    │  │  Password: ______________        │   │
    │  │  Confirm: _______________        │   │
    │  │  First Name: ____________        │   │
    │  │  Last Name: _____________        │   │
    │  │                                  │   │
    │  │  [    Sign Up    ]               │   │
    │  └─────────────────────────────────┘   │
    └─────────────┬───────────────────────────┘
                  │
                  │ Submits Form
                  ↓
    ┌─────────────────────────────────────────┐
    │   Client-Side Validation                │
    │   ✓ Email format                        │
    │   ✓ Password strength                   │
    │   ✓ Password match                      │
    │   ✓ Name format (if provided)           │
    └─────────────┬───────────────────────────┘
                  │
                  │ POST /api/auth/signup
                  ↓
    ┌─────────────────────────────────────────┐
    │         Server Processing               │
    │                                         │
    │  1. Validate input                      │
    │  2. Check email exists                  │
    │  3. Hash password                       │
    │  4. Create user (status: pending)       │
    │  5. Generate activation token           │
    │  6. Set expiration (24h)                │
    │  7. Send verification email             │
    └─────────────┬───────────────────────────┘
                  │
                  │ 201 Created
                  ↓
    ┌─────────────────────────────────────────┐
    │         Success Screen                  │
    │                                         │
    │   ✓ Registration initiated              │
    │                                         │
    │   📧 Check your email                   │
    │   We sent a verification link to        │
    │   user@example.com                      │
    │                                         │
    │   [Resend Email] [Back to Login]        │
    └─────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                        STEP 2: EMAIL VERIFICATION                          ║
╚═══════════════════════════════════════════════════════════════════════════╝

    ┌─────────────────────────────────────────┐
    │         User's Email Inbox              │
    │                                         │
    │  From: MEDANTA <noreply@medanta.org>    │
    │  Subject: Activate Your Account         │
    │                                         │
    │  ┌─────────────────────────────────┐   │
    │  │  Hello,                          │   │
    │  │                                  │   │
    │  │  Thank you for registering!      │   │
    │  │  Click below to activate:        │   │
    │  │                                  │   │
    │  │  [  Activate My Account  ]       │   │
    │  │                                  │   │
    │  │  Or copy this link:              │   │
    │  │  http://localhost:4000/register/ │   │
    │  │  eae124876dba31dd22c7468b6749a17 │   │
    │  │                                  │   │
    │  │  Link expires in 24 hours        │   │
    │  └─────────────────────────────────┘   │
    └─────────────┬───────────────────────────┘
                  │
                  │ User clicks link
                  ↓


╔═══════════════════════════════════════════════════════════════════════════╗
║                    STEP 3: COMPLETE REGISTRATION                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

    ┌─────────────────────────────────────────┐
    │  Registration Page                      │
    │  /register/{token}                      │
    └─────────────┬───────────────────────────┘
                  │
                  │ Page loads
                  ↓
    ┌─────────────────────────────────────────┐
    │   Validating Token...                   │
    │   ⟳ Loading                              │
    └─────────────┬───────────────────────────┘
                  │
                  │ GET /api/auth/register/validate/{token}
                  ↓
    ┌─────────────────────────────────────────┐
    │      Server Validates Token             │
    │                                         │
    │  ✓ Token exists                         │
    │  ✓ Token not expired                    │
    │  ✓ Account still pending                │
    │                                         │
    │  Returns: email, userId, names          │
    └─────────────┬───────────────────────────┘
                  │
                  │ 200 OK (Valid)
                  ↓
    ┌─────────────────────────────────────────┐
    │    Registration Form                    │
    │                                         │
    │  ┌─────────────────────────────────┐   │
    │  │  Email: user@example.com ✓      │   │
    │  │  (verified, cannot change)       │   │
    │  │                                  │   │
    │  │  First Name: *___________        │   │
    │  │  Last Name: *____________        │   │
    │  │  Phone: _________________        │   │
    │  │  Organization: __________        │   │
    │  │  Department: [Select  ▼]         │   │
    │  │  Country: [Select     ▼]         │   │
    │  │  Language: [English   ▼]         │   │
    │  │                                  │   │
    │  │  ☑ I accept Terms & Conditions   │   │
    │  │                                  │   │
    │  │  [ Complete Registration ]       │   │
    │  └─────────────────────────────────┘   │
    └─────────────┬───────────────────────────┘
                  │
                  │ User fills & submits
                  ↓
    ┌─────────────────────────────────────────┐
    │   Client-Side Validation                │
    │   ✓ First name (2-50 chars, letters)    │
    │   ✓ Last name (2-50 chars, letters)     │
    │   ✓ Phone format (if provided)          │
    │   ✓ Terms accepted                      │
    └─────────────┬───────────────────────────┘
                  │
                  │ POST /api/auth/register/{token}
                  ↓
    ┌─────────────────────────────────────────┐
    │      Server Activates Account           │
    │                                         │
    │  1. Validate token again                │
    │  2. Validate form data                  │
    │  3. Update user profile                 │
    │  4. Change status: pending → active     │
    │  5. Invalidate token                    │
    │  6. Set activation timestamp            │
    └─────────────┬───────────────────────────┘
                  │
                  │ 200 OK (Success)
                  ↓
    ┌─────────────────────────────────────────┐
    │      Success Screen                     │
    │                                         │
    │   ✓ Account Activated!                  │
    │                                         │
    │   Your account has been activated.      │
    │   Redirecting to login...               │
    │                                         │
    │   [Go to Login Now]                     │
    └─────────────┬───────────────────────────┘
                  │
                  │ Auto-redirect (3 seconds)
                  ↓
    ┌─────────────────────────────────────────┐
    │       Login Page                        │
    │                                         │
    │  ┌─────────────────────────────────┐   │
    │  │  Email: _________________        │   │
    │  │  Password: ______________        │   │
    │  │                                  │   │
    │  │  [    Login    ]                 │   │
    │  └─────────────────────────────────┘   │
    └─────────────┬───────────────────────────┘
                  │
                  │ User logs in
                  ↓
    ┌─────────────────────────────────────────┐
    │      Dashboard / Home Page              │
    │      ✓ Authenticated User               │
    └─────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                          ERROR SCENARIOS                                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO 1: Email Already Exists                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Signup Form                                                                │
│       ↓                                                                     │
│  POST /api/auth/signup                                                      │
│       ↓                                                                     │
│  409 Conflict (EMAIL_EXISTS)                                                │
│       ↓                                                                     │
│  ┌─────────────────────────────────────┐                                   │
│  │  ⚠ Email already registered         │                                   │
│  │                                      │                                   │
│  │  This email is already in use.       │                                   │
│  │                                      │                                   │
│  │  [Login Instead]  [Use Different]    │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO 2: Token Expired                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks old activation link (>24h)                                     │
│       ↓                                                                     │
│  /register/{token}                                                          │
│       ↓                                                                     │
│  GET /api/auth/register/validate/{token}                                    │
│       ↓                                                                     │
│  410 Gone (TOKEN_EXPIRED)                                                   │
│       ↓                                                                     │
│  ┌─────────────────────────────────────┐                                   │
│  │  ⚠ Activation Link Expired          │                                   │
│  │                                      │                                   │
│  │  This link has expired.              │                                   │
│  │  Links are valid for 24 hours.       │                                   │
│  │                                      │                                   │
│  │  [Resend Email]  [Sign Up Again]     │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO 3: Account Already Activated                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Registration Form                                                          │
│       ↓                                                                     │
│  POST /api/auth/register/{token}                                            │
│       ↓                                                                     │
│  409 Conflict (ACCOUNT_ALREADY_ACTIVE)                                      │
│       ↓                                                                     │
│  ┌─────────────────────────────────────┐                                   │
│  │  ℹ Account Already Activated         │                                   │
│  │                                      │                                   │
│  │  This account is already active.     │                                   │
│  │  Redirecting to login...             │                                   │
│  │                                      │                                   │
│  │  [Go to Login]                       │                                   │
│  └─────────────────────────────────────┘                                   │
│       ↓                                                                     │
│  Auto-redirect to /login (2 seconds)                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO 4: Validation Errors                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Registration Form (incomplete)                                             │
│       ↓                                                                     │
│  POST /api/auth/register/{token}                                            │
│       ↓                                                                     │
│  400 Bad Request (Validation Errors)                                        │
│       ↓                                                                     │
│  ┌─────────────────────────────────────┐                                   │
│  │  First Name: ___________             │                                   │
│  │  ❌ First name is required           │                                   │
│  │                                      │                                   │
│  │  Last Name: ____________             │                                   │
│  │  ❌ Last name must be 2-50 chars     │                                   │
│  │                                      │                                   │
│  │  ☐ Accept Terms                      │                                   │
│  │  ❌ You must accept terms             │                                   │
│  │                                      │                                   │
│  │  [Complete Registration]             │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                          DATA FLOW DIAGRAM                                 ║
╚═══════════════════════════════════════════════════════════════════════════╝

  Frontend                   API Layer                    Backend
┌──────────────┐          ┌──────────────┐           ┌──────────────┐
│              │          │              │           │              │
│  SignUp.tsx  │─────────▶│ signupApi.ts │──────────▶│  DSpace API  │
│              │  signup()│              │  POST     │              │
│  /signUp     │          │              │  /signup  │  /api/auth/  │
│              │          │              │           │  signup      │
└──────────────┘          └──────────────┘           └──────┬───────┘
                                                            │
                                                            │ Creates user
                                                            │ Sends email
                                                            │
                                                            ↓
                                                     ┌──────────────┐
                                                     │              │
                                                     │   Database   │
                                                     │              │
                                                     │  User Table  │
                                                     │  Token Table │
                                                     │              │
                                                     └──────────────┘

┌──────────────┐          ┌──────────────┐           ┌──────────────┐
│              │          │              │           │              │
│ Register.tsx │─────────▶│ signupApi.ts │──────────▶│  DSpace API  │
│              │validate  │              │  GET      │              │
│ /register/   │Token()   │              │  /validate│  /api/auth/  │
│ {token}      │          │              │           │  register/   │
│              │          │              │           │  validate/   │
│              │          │              │           │  {token}     │
└──────────────┘          └──────────────┘           └──────┬───────┘
      │                         │                           │
      │ complete                │                           │ Validates
      │ Registration            │                           │ token
      │                         │                           │
      │                         │  POST /register/{token}   │
      └────────────────────────▶│──────────────────────────▶│
                                │                           │
                                │                           │ Activates
                                │                           │ user
                                │                           │
                                │           200 OK          │
                                │◀──────────────────────────│
                                │                           │
                                ↓                           ↓
                         Success Response            Updated Database


╔═══════════════════════════════════════════════════════════════════════════╗
║                           STATE DIAGRAM                                    ║
╚═══════════════════════════════════════════════════════════════════════════╝

                        User Account States

    ┌─────────────┐
    │   No        │
    │  Account    │
    └──────┬──────┘
           │
           │ POST /api/auth/signup
           │
           ↓
    ┌─────────────┐                    ┌─────────────┐
    │   PENDING   │───────────────────▶│   EXPIRED   │
    │             │  Token expires      │             │
    │  Awaiting   │  (24 hours)         │  Must sign  │
    │  email      │                     │  up again   │
    │  verification│                    │             │
    └──────┬──────┘                    └─────────────┘
           │
           │ POST /api/auth/register/{token}
           │
           ↓
    ┌─────────────┐
    │   ACTIVE    │
    │             │
    │  Can login  │
    │  Full access│
    │             │
    └─────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║                      COMPONENT INTERACTION                                 ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────┐
│                           Component Tree                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  App.tsx                                                                 │
│    │                                                                     │
│    ├─ BrowserRouter                                                     │
│    │    │                                                               │
│    │    ├─ Routes                                                       │
│    │    │    │                                                          │
│    │    │    ├─ Route("/signUp")                                        │
│    │    │    │    └─ SignUp.tsx                                         │
│    │    │    │         ├─ Input (Email)                                 │
│    │    │    │         ├─ Input (Password)                              │
│    │    │    │         ├─ Input (Confirm Password)                      │
│    │    │    │         ├─ Input (First Name)                            │
│    │    │    │         ├─ Input (Last Name)                             │
│    │    │    │         ├─ Button (Submit)                               │
│    │    │    │         └─ useToast (Notifications)                      │
│    │    │    │                                                          │
│    │    │    └─ Route("/register/:token")                               │
│    │    │         └─ Register.tsx                                       │
│    │    │              ├─ Token Validation                              │
│    │    │              ├─ Input (First Name)                            │
│    │    │              ├─ Input (Last Name)                             │
│    │    │              ├─ Input (Phone)                                 │
│    │    │              ├─ Input (Organization)                          │
│    │    │              ├─ Select (Department)                           │
│    │    │              ├─ Select (Country)                              │
│    │    │              ├─ Select (Language)                             │
│    │    │              ├─ Checkbox (Terms)                              │
│    │    │              ├─ Button (Submit)                               │
│    │    │              └─ useToast (Notifications)                      │
│    │    │                                                               │
│    │    └─ Route("/login")                                              │
│    │         └─ Login.tsx                                               │
│    │                                                                     │
│    └─ Providers                                                         │
│         ├─ QueryClientProvider                                          │
│         ├─ AuthProvider                                                 │
│         └─ ToastProvider                                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                         API Service Layer                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  signupApi.ts                                                            │
│    │                                                                     │
│    ├─ signup(data)                                                      │
│    │    └─ POST /api/auth/signup                                        │
│    │                                                                     │
│    ├─ validateRegistrationToken(token)                                  │
│    │    └─ GET /api/auth/register/validate/{token}                      │
│    │                                                                     │
│    ├─ completeRegistrationWithToken(token, data)                        │
│    │    └─ POST /api/auth/register/{token}                              │
│    │                                                                     │
│    └─ resendActivationEmail(email)                                      │
│         └─ POST /api/auth/resend-activation                             │
│                                                                          │
│  axiosInstance.ts                                                        │
│    └─ Axios HTTP client with base configuration                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════

                              END OF DIAGRAM

═══════════════════════════════════════════════════════════════════════════
```
