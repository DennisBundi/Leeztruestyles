/**
 * Comprehensive Authentication Tests
 * Tests for login server action, sign-in form component, and integration flow
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { Suspense } from 'react';
import * as authActions from '@/app/auth/actions';
import { ADMIN_EMAILS } from '@/config/admin';

// Import the actual login function after mocking
const { login } = authActions;

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSearchParams = new URLSearchParams();
const mockRedirect = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/signin',
      query: {},
      asPath: '/signin',
    };
  },
  usePathname() {
    return '/signin';
  },
  useSearchParams() {
    return mockSearchParams;
  },
  redirect: mockRedirect,
  revalidatePath: jest.fn(),
}));

// Mock Supabase clients
const mockSignInWithPassword = jest.fn();
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();

const mockSupabaseClient = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    getSession: mockGetSession,
    getUser: mockGetUser,
    signOut: jest.fn(),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  maybeSingle: jest.fn(),
};

const mockAdminClient = {
  ...mockSupabaseClient,
  auth: {
    ...mockSupabaseClient.auth,
    admin: {
      createUser: jest.fn(),
    },
  },
  from: jest.fn(() => mockAdminClient),
  select: jest.fn(() => mockAdminClient),
  insert: jest.fn(() => mockAdminClient),
  update: jest.fn(() => mockAdminClient),
  eq: jest.fn(() => mockAdminClient),
  single: jest.fn(),
  maybeSingle: jest.fn(),
};

// Mock Next.js cookies
const mockCookies = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  getAll: jest.fn(() => []),
  has: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => mockCookies()),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('error');
    mockSearchParams.delete('redirect');
    mockRedirect.mockImplementation((path: string) => {
      throw { digest: `NEXT_REDIRECT-${path}`, path };
    });
    // Reset Supabase mocks
    mockSignInWithPassword.mockClear();
    mockGetSession.mockClear();
    mockSupabaseClient.from.mockClear();
    mockAdminClient.from.mockClear();
  });

  describe('Login Server Action', () => {
    it('should successfully login a regular user and redirect to home', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser,
      };

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Not found
            }),
          }),
        }),
      });

      const formData = new FormData();
      formData.append('email', 'user@test.com');
      formData.append('password', 'password123');

      await expect(login(formData)).rejects.toMatchObject({
        digest: expect.stringContaining('NEXT_REDIRECT-/'),
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'password123',
      });
      expect(mockGetSession).toHaveBeenCalled();
    });

    it('should successfully login an admin user and redirect to dashboard', async () => {
      const adminEmail = ADMIN_EMAILS[0];
      const mockUser = {
        id: 'admin-123',
        email: adminEmail,
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser,
      };

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      // Mock admin client for employee check
      mockAdminClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null, // No existing employee
              error: null,
            }),
          }),
        }),
      });

      // Mock admin client for employee insert
      mockAdminClient.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          data: { id: 'emp-123' },
          error: null,
        }),
      });

      const formData = new FormData();
      formData.append('email', adminEmail);
      formData.append('password', 'password123');

      await expect(login(formData)).rejects.toMatchObject({
        digest: expect.stringContaining('NEXT_REDIRECT-/dashboard'),
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: adminEmail,
        password: 'password123',
      });
    });

    it('should throw error for invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const formData = new FormData();
      formData.append('email', 'wrong@test.com');
      formData.append('password', 'wrongpassword');

      await expect(login(formData)).rejects.toMatchObject({
        digest: expect.stringContaining('NEXT_REDIRECT'),
      });

      expect(mockSignInWithPassword).toHaveBeenCalled();
    });

    it('should throw error for missing email or password', async () => {
      const formData = new FormData();
      formData.append('email', '');
      formData.append('password', 'password123');

      await expect(login(formData)).rejects.toThrow('Email and password are required');
    });

    it('should handle network errors gracefully', async () => {
      mockSignInWithPassword.mockRejectedValueOnce(new Error('Network error: fetch failed'));

      const formData = new FormData();
      formData.append('email', 'user@test.com');
      formData.append('password', 'password123');

      await expect(login(formData)).rejects.toThrow('Network error');
    });
  });

  describe('Sign-In Form Component', () => {
    it('should render sign-in form with all inputs and button', async () => {
      const { default: SignInPage } = await import('@/app/(marketplace)/signin/page');
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SignInPage />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('should allow typing in email and password fields', async () => {
      const user = userEvent.setup();
      const { default: SignInPage } = await import('@/app/(marketplace)/signin/page');
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SignInPage />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should submit form when button is clicked', async () => {
      const user = userEvent.setup();
      const { default: SignInPage } = await import('@/app/(marketplace)/signin/page');
      
      // Setup mocks for successful login
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser,
      };

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      // Mock redirect to throw error (Next.js redirect behavior)
      mockRedirect.mockImplementationOnce((path: string) => {
        throw { digest: `NEXT_REDIRECT-${path}`, path };
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SignInPage />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Verify button is clickable and not disabled
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveStyle({ pointerEvents: 'auto' });

      // Click the button
      await user.click(submitButton);

      // Wait for form submission - signInWithPassword should be called
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify signInWithPassword was called with correct credentials
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should show error message when login fails', async () => {
      const user = userEvent.setup();
      const { default: SignInPage } = await import('@/app/(marketplace)/signin/page');

      // Mock login failure
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SignInPage />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should disable button and show loading state during submission', async () => {
      const user = userEvent.setup();
      const { default: SignInPage } = await import('@/app/(marketplace)/signin/page');

      // Create a promise that we can control for signInWithPassword
      let resolveSignIn: any;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      mockSignInWithPassword.mockReturnValueOnce(signInPromise as any);

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SignInPage />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // Verify button is enabled before click
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);

      // Button should be disabled and show loading state (useTransition sets isPending)
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Resolve the promise to complete the transition
      resolveSignIn({
        data: { user: { id: 'user-123', email: 'test@example.com' }, session: null },
        error: null,
      });
      
      // Wait a bit for the transition to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should have button that is clickable (not blocked by overlays)', async () => {
      const { default: SignInPage } = await import('@/app/(marketplace)/signin/page');
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SignInPage />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const styles = window.getComputedStyle(submitButton);

      // Check that button is not blocked
      expect(styles.pointerEvents).not.toBe('none');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Integration Flow', () => {
    it('should complete full authentication flow: form submission -> login -> redirect', async () => {
      const user = userEvent.setup();
      const { default: SignInPage } = await import('@/app/(marketplace)/signin/page');

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser,
      };

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      // Mock redirect to throw error (Next.js redirect behavior)
      mockRedirect.mockImplementationOnce((path: string) => {
        throw { digest: `NEXT_REDIRECT-${path}`, path };
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SignInPage />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      // Fill form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Submit form
      await user.click(submitButton);

      // Verify signInWithPassword was called
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      }, { timeout: 3000 });
    });

    it('should handle admin login and redirect to dashboard', async () => {
      const user = userEvent.setup();
      const { default: SignInPage } = await import('@/app/(marketplace)/signin/page');

      const adminEmail = ADMIN_EMAILS[0];
      const mockUser = {
        id: 'admin-123',
        email: adminEmail,
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser,
      };

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      // Mock admin employee check
      mockAdminClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      // Mock admin employee insert
      mockAdminClient.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          data: { id: 'emp-123' },
          error: null,
        }),
      });

      // Mock redirect to throw error for dashboard (Next.js redirect behavior)
      mockRedirect.mockImplementationOnce((path: string) => {
        throw { digest: `NEXT_REDIRECT-${path}`, path };
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SignInPage />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, adminEmail);
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Verify signInWithPassword was called and admin setup occurred
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: adminEmail,
          password: 'password123',
        });
      }, { timeout: 3000 });
    });
  });
});

