# SSO Implementation Plan for General User

This plan outlines the steps to implement Single Sign-On (SSO) for general users in the Auth Service, referencing the endpoints and flows described in `swagger-spec.json`.

---

## 1. Requirements & Goals
- Allow users to authenticate using SSO (e.g., Google, Facebook, etc.)
- Integrate SSO with existing `/auth/login`, `/auth/register`, and session endpoints
- Ensure SSO users are mapped to the `User` model (with Firebase integration)
- Support JWT-based session management
- Maintain compatibility with existing endpoints and user flows

---

## 2. High-Level Steps
1. **Choose SSO Providers**
   - Google, Facebook, Apple, etc. (start with Google for MVP)
2. **Add SSO endpoints**
   - `/auth/sso/:provider` (redirect/initiate)
   - `/auth/sso/:provider/callback` (handle provider response)
3. **Integrate with Firebase Auth**
   - Use Firebase Admin SDK to verify SSO tokens and manage users
4. **Map SSO users to Prisma `User` model**
   - On first login, create user if not exists
   - On subsequent logins, update profile if needed
5. **Issue JWT for session**
   - Reuse `/auth/login` response format
6. **Update Swagger/OpenAPI spec**
   - Document new endpoints and flows

---

## 3. Detailed Steps

### 3.1. SSO Endpoint Design
- `POST /auth/sso/:provider` — Initiate SSO login (redirect to provider)
- `GET /auth/sso/:provider/callback` — Handle provider callback, exchange code for token, verify, and log in user

### 3.2. SSO Controller & Service
- Create `SsoController` and `SsoService`
- Use Passport.js or Firebase Auth for provider integration
- On callback:
  - Verify provider token
  - Get user info (email, name, etc.)
  - Check if user exists in Prisma `User` table
    - If not, create new user (with Firebase UID)
    - If exists, update info if needed
  - Issue JWT (same as `/auth/login`)
  - Return user info and token

### 3.3. User Model Mapping
- Ensure SSO users are uniquely identified (by email or provider UID)
- Store provider info if needed (e.g., `provider`, `providerId` fields)
- Link SSO users to Firebase for unified auth

### 3.4. Session Management
- Use existing JWT/session logic
- Support `/auth/verify` and `/auth/logout` for SSO users

### 3.5. Security & Validation
- Validate tokens from SSO providers
- Prevent duplicate accounts (unique email constraint)
- Handle edge cases (revoked tokens, missing email, etc.)

### 3.6. Update API Documentation
- Add SSO endpoints to Swagger/OpenAPI
- Document request/response examples

---

## 4. Example Flow (Google SSO)
1. User clicks "Sign in with Google"
2. Frontend redirects to `/auth/sso/google`
3. User authenticates with Google, redirected to `/auth/sso/google/callback`
4. Backend verifies Google token, fetches user info
5. If user exists, log in; else, create user
6. Issue JWT and return user info

---

## 5. Next Steps
- [ ] Confirm SSO providers to support
- [ ] Implement SsoController and SsoService
- [ ] Integrate with Firebase Admin
- [ ] Update User model if needed
- [ ] Add tests for SSO flows
- [ ] Update Swagger spec
