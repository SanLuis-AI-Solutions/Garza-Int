import React, { useEffect, useId, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import type { InvestmentStrategy } from '../domain/strategies/types';

type AuthGateProps = {
  children: (args: { session: Session; access: AccessInfo }) => React.ReactNode;
};

type EntitlementRow = {
  strategy: InvestmentStrategy;
  active: boolean;
  expires_at: string | null;
};

type MfaExemptionRow = {
  active: boolean;
  expires_at: string | null;
};

type AccessInfo = {
  allowedStrategies: InvestmentStrategy[];
  trialEndsAt: string | null;
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
  const requireMfa = (import.meta.env.VITE_AUTH_REQUIRE_MFA as string | undefined) === 'true';
  const [aalLoading, setAalLoading] = useState(false);
  const [aalError, setAalError] = useState<string | null>(null);
  const [aal, setAal] = useState<{ currentLevel: string | null; nextLevel: string | null } | null>(null);
  const [mfaBypass, setMfaBypass] = useState<{ active: boolean; expiresAt: string | null } | null>(null);
  const [mfaBypassLoading, setMfaBypassLoading] = useState(false);
  const [mfaBypassError, setMfaBypassError] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const adminEmail = 'contact@sanluisai.com';

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
      setAccess(null);
      setAccessError(null);
      setAccessLoading(false);
      return;
    }
    checkApproval(session);
  }, [session]);

  useEffect(() => {
    if (!supabase) return;
    if (!requireMfa) {
      setAal(null);
      setAalError(null);
      setAalLoading(false);
      setMfaBypass(null);
      setMfaBypassError(null);
      setMfaBypassLoading(false);
      return;
    }
    if (!session) return;

    let mounted = true;
    setAalError(null);
    setAalLoading(true);
    setMfaBypass(null);
    setMfaBypassError(null);
    setMfaBypassLoading(false);
    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) throw error;
        setAal({ currentLevel: data.currentLevel, nextLevel: data.nextLevel });
      })
      .catch((e: any) => {
        if (!mounted) return;
        setAal({ currentLevel: null, nextLevel: null });
        setAalError(e?.message ?? 'MFA check failed');
      })
      .finally(() => {
        if (!mounted) return;
        setAalLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [requireMfa, session?.access_token]);

  const checkMfaBypass = async (activeSession: Session) => {
    if (!supabase) return false;
    const email = (activeSession.user.email ?? '').toLowerCase();
    if (!email) return false;

    setMfaBypassError(null);
    setMfaBypassLoading(true);
    try {
      const { data, error } = await supabase
        .from('mfa_exemptions')
        .select('active,expires_at')
        .eq('email', activeSession.user.email ?? '')
        .maybeSingle();

      // If the table isn't deployed yet, treat as no bypass.
      if (error) {
        const msg = String((error as any)?.message ?? '');
        if (msg.includes('mfa_exemptions') && msg.includes('does not exist')) {
          setMfaBypass({ active: false, expiresAt: null });
          return false;
        }
        throw error;
      }

      const row = (data ?? null) as MfaExemptionRow | null;
      const now = Date.now();
      const active =
        Boolean(row?.active) && (!row?.expires_at || new Date(row.expires_at).getTime() > now);

      setMfaBypass({ active, expiresAt: row?.expires_at ?? null });
      return active;
    } catch (err: any) {
      setMfaBypass({ active: false, expiresAt: null });
      setMfaBypassError(err?.message ?? 'MFA bypass check failed');
      return false;
    } finally {
      setMfaBypassLoading(false);
    }
  };

  const checkEntitlements = async (activeSession: Session) => {
    if (!supabase) return;
    const email = (activeSession.user.email ?? '').toLowerCase();
    setAccessError(null);
    setAccessLoading(true);
    try {
      // Admin always has access, even during migrations or temporary table drift.
      if (email && email === adminEmail.toLowerCase()) {
        setAccess({ allowedStrategies: ['DEVELOPER', 'LANDLORD', 'FLIPPER'], trialEndsAt: null });
        return;
      }

      const { data, error } = await supabase
        .from('user_entitlements')
        .select('strategy,active,expires_at')
        .eq('email', activeSession.user.email ?? '');

      // Backward-compatible: if the entitlements table isn't deployed yet, don't lock users out.
      if (error) {
        const msg = String((error as any)?.message ?? '');
        if (msg.includes('user_entitlements') && msg.includes('does not exist')) {
          setAccess({ allowedStrategies: ['DEVELOPER', 'LANDLORD', 'FLIPPER'], trialEndsAt: null });
          return;
        }
        throw error;
      }

      const rows = (data ?? []) as EntitlementRow[];
      const now = Date.now();
      const allowed = rows
        .filter((r) => {
          if (!r.active) return false;
          if (!r.expires_at) return true;
          return new Date(r.expires_at).getTime() > now;
        })
        .map((r) => r.strategy);

      const trialEndsAt =
        rows
          .map((r) => r.expires_at)
          .filter((x): x is string => Boolean(x))
          .sort()
          .at(-1) ?? null;

      setAccess({ allowedStrategies: Array.from(new Set(allowed)), trialEndsAt });
    } catch (err: any) {
      setAccess({ allowedStrategies: [], trialEndsAt: null });
      setAccessError(err?.message ?? 'Access check failed');
    } finally {
      setAccessLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    if (!session) return;
    if (approved !== true) return;
    if (requireMfa && aal?.currentLevel !== 'aal2' && mfaBypass?.active !== true) return;
    checkEntitlements(session);
  }, [session?.user?.email, session?.access_token, approved, requireMfa, aal?.currentLevel, mfaBypass?.active]);

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

  if (requireMfa) {
    if (aalLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center gi-muted">
          Checking security…{'\u00A0'}(MFA)
        </div>
      );
    }
    if (aal?.currentLevel !== 'aal2') {
      if (mfaBypassLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center gi-muted">
            Checking security…{'\u00A0'}(MFA Bypass)
          </div>
        );
      }

      // One-time bypass check per signed-in session.
      if (mfaBypass === null && !mfaBypassLoading) {
        checkMfaBypass(session);
        return (
          <div className="min-h-screen flex items-center justify-center gi-muted">
            Checking security…{'\u00A0'}(MFA Bypass)
          </div>
        );
      }

      if (mfaBypass?.active !== true) {
        return (
          <MfaRequired
            email={session.user.email ?? ''}
            error={mfaBypassError ?? aalError}
            onComplete={async () => {
              if (!supabase) return;
              const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
              setAal({ currentLevel: data.currentLevel, nextLevel: data.nextLevel });
            }}
            onSignOut={async () => {
              if (!supabase) return;
              await supabase.auth.signOut();
            }}
          />
        );
      }
    }
  }

  if (accessLoading || !access) {
    return (
      <div className="min-h-screen flex items-center justify-center gi-muted">
        Checking access…{'\u00A0'}(Plans)
      </div>
    );
  }

  if (access.allowedStrategies.length === 0) {
    return (
      <TrialExpired
        email={session.user.email ?? ''}
        error={accessError}
        trialEndsAt={access.trialEndsAt}
        onRefresh={() => checkEntitlements(session)}
        onSignOut={async () => {
          if (!supabase) return;
          await supabase.auth.signOut();
        }}
      />
    );
  }

  return <>{children({ session, access })}</>;
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const emailId = useId();
  const passwordId = useId();

  const sendMagicLink = async () => {
    if (!supabase) return;
    const cleaned = email.trim();
    if (!cleaned) {
      setError('Enter an email first');
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: cleaned,
        options: { emailRedirectTo: window.location.origin },
      });
      if (otpErr) throw otpErr;
      setMessage('Magic link sent. Check your email on this device and open the link to finish signing in.');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send magic link');
    } finally {
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
            <img
              src="/garza-logo.png"
              alt="Garza International Properties"
              width={2500}
              height={1000}
              className="h-8 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight gi-serif">Garza ROI Dashboard</h1>
          <p className="mt-1 text-sm gi-muted">Sign in to access the calculator and analysis tools.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor={emailId} className="block text-sm font-medium text-white/90">
                Email
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="mt-1 w-full gi-input px-3 py-2"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor={passwordId} className="block text-sm font-medium text-white/90">
                Password
              </label>
              <input
                id={passwordId}
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
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

            {!isSignUp && (
              <button
                type="button"
                onClick={sendMagicLink}
                disabled={submitting}
                className="w-full gi-btn gi-btn-secondary disabled:opacity-60 font-semibold py-2.5"
              >
                Email Me a Magic Link
              </button>
            )}
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
          <p className="mt-2 text-[11px] gi-muted2">
            Magic links require your Supabase Auth redirect URLs to include{' '}
            <span className="font-mono text-white/80">{window.location.origin}</span>.
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

const MfaRequired: React.FC<{
  email: string;
  error: string | null;
  onComplete: () => Promise<void>;
  onSignOut: () => Promise<void>;
}> = ({ email, error, onComplete, onSignOut }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'verify' | 'enroll'>('verify');

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    setLoading(true);
    setLocalError(null);
    supabase.auth.mfa
      .listFactors()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) throw error;
        const existing = data?.totp?.[0];
        if (existing?.id) {
          setFactorId(existing.id);
          setMode('verify');
        } else {
          setMode('enroll');
        }
      })
      .catch((e: any) => {
        if (!mounted) return;
        setLocalError(e?.message ?? 'Failed to load MFA factors');
        setMode('enroll');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleEnroll = async () => {
    if (!supabase) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setMode('verify');
    } catch (e: any) {
      setLocalError(e?.message ?? 'MFA enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!supabase) return;
    if (!factorId) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      const cleaned = code.replace(/\s+/g, '');
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: cleaned });
      if (error) throw error;
      await onComplete();
    } catch (e: any) {
      setLocalError(e?.message ?? 'MFA verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg gi-card p-8">
        <h1 className="text-xl font-bold gi-serif">Multi-Factor Authentication Required</h1>
        <p className="mt-2 text-sm gi-muted">
          Your account <span className="font-medium text-white/95">{email}</span> must verify an authenticator code to access the dashboard.
        </p>

        {(error || localError) && (
          <div className="mt-4 text-sm gi-card border border-red-500/30 text-red-100 rounded-xl px-3 py-2">
            {localError ?? error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 gi-muted">Loading MFA setup…</div>
        ) : (
          <>
            {mode === 'enroll' && (
              <div className="mt-6">
                <div className="text-sm gi-muted">
                  No authenticator is enrolled yet. Click below to enable TOTP (Google Authenticator, 1Password, Authy, etc.).
                </div>
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={submitting}
                  className="mt-4 w-full gi-btn gi-btn-primary disabled:opacity-60 font-semibold py-2.5"
                >
                  {submitting ? 'Enrolling…' : 'Enable MFA (TOTP)'}
                </button>
              </div>
            )}

            {mode === 'verify' && (
              <div className="mt-6 space-y-4">
                {qrSvg && (
                  <div className="gi-card-flat p-4">
                    <div className="text-sm font-semibold text-white/90">Scan QR Code</div>
                    <div className="mt-2 rounded-xl bg-white p-3 inline-block">
                      {/* Supabase returns an SVG string */}
                      <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                    </div>
                    {secret && (
                      <div className="mt-3 text-xs gi-muted2">
                        Can't scan? Use this secret in your authenticator app:{' '}
                        <span className="font-mono text-white/90">{secret}</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/90">Authenticator Code</label>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    className="mt-1 w-full gi-input px-3 py-2"
                    autoComplete="one-time-code"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={submitting || code.trim().length < 6}
                  className="w-full gi-btn gi-btn-primary disabled:opacity-60 font-semibold py-2.5"
                >
                  {submitting ? 'Verifying…' : 'Verify & Continue'}
                </button>
              </div>
            )}

            <button type="button" onClick={onSignOut} className="mt-4 w-full gi-btn gi-btn-secondary font-semibold py-2.5">
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const TrialExpired: React.FC<{
  email: string;
  error: string | null;
  trialEndsAt: string | null;
  onRefresh: () => void;
  onSignOut: () => void;
}> = ({ email, error, trialEndsAt, onRefresh, onSignOut }) => {
  const formatted = trialEndsAt ? new Date(trialEndsAt).toLocaleString() : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg gi-card p-8">
        <h1 className="text-xl font-bold gi-serif">Access Expired</h1>
        <p className="mt-2 text-sm gi-muted">
          Your access window has ended. Contact an admin to renew access.
        </p>
        <div className="mt-4 text-sm gi-muted2">
          Signed in as <span className="font-mono text-white/90">{email}</span>
        </div>
        {formatted && (
          <div className="mt-2 text-sm gi-muted2">
            Trial ended on <span className="font-mono text-white/90">{formatted}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 text-xs text-red-200 bg-red-500/10 border border-red-500/20 rounded-md p-3">
            {error}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onRefresh} className="gi-btn gi-btn-secondary px-4 py-2.5 text-sm font-semibold">
            Refresh
          </button>
          <button type="button" onClick={onSignOut} className="gi-btn gi-btn-ghost px-4 py-2.5 text-sm font-semibold">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
