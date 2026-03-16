# Nibba Nibbi

## Current State
Fully-featured Instagram-inspired dating platform with posts, reels, stories, follow system, private chat, notifications, admin panel, and username/password auth. Feed loading issue persists due to `authClient` dependency loop in `useInternetIdentity.ts`. No forgot password flow exists.

## Requested Changes (Diff)

### Add
- **Forgot Password flow** on login screen:
  1. Mobile OTP (simulated -- OTP shown on screen)
  2. Security Question verification
  3. Admin reset request (visible in admin panel)
- **Security Question** collection during registration/onboarding (question + answer stored in backend)
- **Backend methods**: `setSecurityQuestion`, `verifySecurityQuestionAndGetOtp`, `resetPasswordWithOtp`, `requestAdminPasswordReset`, `getPendingPasswordResetRequests`, `adminResetPassword`
- **Admin Panel**: new section showing pending password reset requests with approve action

### Modify
- **`useInternetIdentity.ts`**: Fix infinite re-render by removing `authClient` from `useEffect` dependencies using a `useRef` init guard so init runs only once
- **`AuthModal.tsx`**: Add "Forgot Password?" link on Sign In tab that opens a multi-step forgot password modal
- **`OnboardingPage.tsx`**: Add step for security question (question + answer)
- **`AdminPage.tsx`**: Add section for pending password reset requests

### Remove
- Nothing removed

## Implementation Plan
1. Generate backend Motoko with new password-reset methods
2. Fix `useInternetIdentity.ts` init loop (remove `authClient` from effect deps, use ref guard)
3. Update `AuthModal.tsx`: add Forgot Password modal with 3 paths (OTP, Security Q, Admin request)
4. Update `OnboardingPage.tsx`: add security question step
5. Update `AdminPage.tsx`: add password reset requests section
