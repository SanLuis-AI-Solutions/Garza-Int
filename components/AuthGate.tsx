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

    if (allowedEmails.length === 0 && !allowedDomain) return;

    const email = session.user.email.toLowerCase();
    const emailAllowed =
      allowedEmails.length > 0 ? allowedEmails.map((e) => e.toLowerCase()).includes(email) : true;
    const domainAllowed = allowedDomain ? email.endsWith(`@${allowedDomain.toLowerCase()}`) : true;

    if (!emailAllowed || !domainAllowed) {
      supabase.auth.signOut();
    }
  }, [session, allowedEmails, allowedDomain]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-xl font-bold text-slate-900">Authentication Not Configured</h1>
          <p className="mt-2 text-sm text-slate-600">
            Set these Vercel environment variables (or a local <code className="font-mono">.env.local</code>) and
            redeploy:
          </p>
          <ul className="mt-4 text-sm text-slate-700 list-disc pl-5 space-y-1">
            <li>
              <code className="font-mono">VITE_SUPABASE_URL</code>
            </li>
            <li>
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return <>{children({ session })}</>;
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err?.message ?? 'Google sign-in failed');
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'magic') {
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signInError) throw signInError;
        setMessage('Check your email for the sign-in link.');
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Garza ROI Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in to access the calculator and analysis tools.</p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 font-medium py-2.5 border border-slate-200"
          >
            Continue with Google
          </button>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <div className="text-xs text-slate-500">or</div>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('password')}
              className={`px-3 py-2 rounded-lg text-sm border ${
                mode === 'password'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Email + Password
            </button>
            <button
              type="button"
              onClick={() => setMode('magic')}
              className={`px-3 py-2 rounded-lg text-sm border ${
                mode === 'magic'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Magic Link
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@company.com"
              />
            </div>

            {mode === 'password' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-500">
            If you do not have access, contact the administrator to be added.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
