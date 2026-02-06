import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

type AuthGateProps = {
  children: (args: { session: Session }) => React.ReactNode;
};

const parseCsv = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const allowedEmails = useMemo(
    () => parseCsv(import.meta.env.VITE_AUTH_ALLOWED_EMAILS as string | undefined),
    []
  );
  const allowedDomain = (import.meta.env.VITE_AUTH_ALLOWED_DOMAIN as string | undefined)?.trim() ?? '';

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (!session?.user?.email) return;

    // Optional client-side allowlist (extra guardrail, not primary enforcement).
    if (allowedEmails.length > 0 || allowedDomain) {
      const email = session.user.email.toLowerCase();
      const emailAllowed =
        allowedEmails.length > 0 ? allowedEmails.map((e) => e.toLowerCase()).includes(email) : true;
      const domainAllowed = allowedDomain ? email.endsWith(`@${allowedDomain.toLowerCase()}`) : true;

      if (!emailAllowed || !domainAllowed) {
        supabase.auth.signOut();
      }
    }
  }, [session, allowedEmails, allowedDomain]);

  const checkApproval = async (activeSession: Session) => {
    if (!supabase) return;
    setApprovalError(null);
    setApprovalLoading(true);
    try {
      const { data, error } = await supabase
        .from('approved_emails')
        .select('approved')
        .eq('email', activeSession.user.email ?? '')
        .maybeSingle();

      if (error) throw error;
      if (!data && activeSession.user.email) {
        // If no request exists yet, create one so admins can approve from the dashboard.
        const email = activeSession.user.email;
        const { error: insertError } = await supabase
          .from('approved_emails')
          .insert({ email, approved: false, approved_at: null });

        // Ignore duplicate key errors (already requested).
        if (insertError && insertError.code !== '23505') throw insertError;
      }

      setApproved(Boolean(data?.approved));
    } catch (err: any) {
      setApproved(false);
      setApprovalError(err?.message ?? 'Approval check failed');
    } finally {
      setApprovalLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    if (!session) {
      setApproved(null);
      setApprovalError(null);
      setApprovalLoading(false);
      return;
    }
    checkApproval(session);
  }, [session]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-lg gi-card p-8">
          <h1 className="text-xl font-bold gi-serif">Authentication Not Configured</h1>
          <p className="mt-2 text-sm gi-muted">
            Set these Vercel environment variables (or a local <code className="font-mono">.env.local</code>) and
            redeploy:
          </p>
          <ul className="mt-4 text-sm gi-muted list-disc pl-5 space-y-1">
            <li>
              <code className="font-mono">VITE_SUPABASE_URL</code>
            </li>
            <li>
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
          <p className="mt-4 text-xs gi-muted2">
            Optional allowlist:
            <span className="font-mono"> VITE_AUTH_ALLOWED_EMAILS</span>,
            <span className="font-mono"> VITE_AUTH_ALLOWED_DOMAIN</span>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gi-muted">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (approvalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gi-muted">
        Checking access…
      </div>
    );
  }

  if (!approved) {
    return (
      <PendingApproval
        email={session.user.email ?? ''}
        error={approvalError}
        onRefresh={() => checkApproval(session)}
        onSignOut={async () => {
          if (!supabase) return;
          await supabase.auth.signOut();
        }}
      />
    );
  }

  return <>{children({ session })}</>;
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        setMessage('Account created. You may need to confirm your email, then wait for approval.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err?.message ?? 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="gi-card p-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 px-4 py-3 mb-4">
            <img src="/garza-logo.png" alt="Garza International Properties" className="h-8 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight gi-serif">Garza ROI Dashboard</h1>
          <p className="mt-1 text-sm gi-muted">Sign in to access the calculator and analysis tools.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 w-full gi-input px-3 py-2"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1 w-full gi-input px-3 py-2"
              />
            </div>

            {error && (
              <div className="text-sm gi-card border border-red-500/30 text-red-100 rounded-xl px-3 py-2">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm gi-card border border-green-500/30 text-green-100 rounded-xl px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full gi-btn gi-btn-primary disabled:opacity-60 font-semibold py-2.5"
            >
              {submitting ? 'Working…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsSignUp((v) => !v);
              setError(null);
              setMessage(null);
            }}
            className="mt-4 w-full text-sm gi-muted hover:text-white/90"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </button>

          <p className="mt-4 text-xs gi-muted2">
            If you do not have access, contact the administrator to be added.
          </p>
        </div>
      </div>
    </div>
  );
};

const PendingApproval: React.FC<{
  email: string;
  error: string | null;
  onRefresh: () => void;
  onSignOut: () => Promise<void>;
}> = ({ email, error, onRefresh, onSignOut }) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg gi-card p-8">
        <h1 className="text-xl font-bold gi-serif">Pending Approval</h1>
        <p className="mt-2 text-sm gi-muted">
          Your account <span className="font-medium text-white/95">{email}</span> is signed in, but it has not been
          approved to access the dashboard yet.
        </p>
        {error && (
          <div className="mt-4 text-sm gi-card border border-red-500/30 text-red-100 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="flex-1 gi-btn gi-btn-primary font-semibold py-2.5"
          >
            Check Again
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex-1 gi-btn gi-btn-secondary font-semibold py-2.5"
          >
            Sign Out
          </button>
        </div>
        <p className="mt-4 text-xs gi-muted2">
          Admin approval is required. Once approved, click “Check Again” or refresh the page.
        </p>
      </div>
    </div>
  );
};

export default AuthGate;
