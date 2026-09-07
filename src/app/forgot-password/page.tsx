'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PhoneInput from '@/components/ui/PhoneInput';

type Step = 'method' | 'code' | 'ask_email' | 'email_sent' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
        <div className="animate-pulse-soft text-gray-400">Loading...</div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep: Step = searchParams.get('step') === 'reset' ? 'reset' : 'method';
  const [step, setStep] = useState<Step>(initialStep);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [code, setCode] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  function maskContact(value: string, type: 'email' | 'phone') {
    if (type === 'email') {
      const [name, domain] = value.split('@');
      return `${name.charAt(0)}***${name.charAt(name.length - 1)}@${domain}`;
    }
    return `${value.slice(0, 3)}***${value.slice(-2)}`;
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const queryField = method === 'email' ? 'email' : 'phone_number';
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq(queryField, contact)
        .single();

      if (!profile) {
        setError(method === 'email'
          ? 'No account found with that email address.'
          : 'No account found with that phone number.');
        setLoading(false);
        return;
      }

      const userEmail = profile.email || '';

      if (!userEmail) {
        setError('No email on record for this account.');
        setLoading(false);
        return;
      }

      if (method === 'phone') {
        const { error: emailError } = await supabase.auth.resetPasswordForEmail(userEmail, {
          redirectTo: `${window.location.origin}/auth/callback?next=/forgot-password%3Fstep%3Dreset`,
        });

        if (emailError) {
          setError('Failed to send reset link. Please try again.');
          setLoading(false);
          return;
        }

        setUserEmail(userEmail);
        setStep('email_sent');
        setLoading(false);
        return;
      }

      const resetCode = String(Math.floor(1000 + Math.random() * 9000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from('password_reset_codes')
        .insert({ profile_id: profile.id, code: resetCode, expires_at: expiresAt });

      if (insertError) {
        setError('Failed to send reset code. Please try again.');
        setLoading(false);
        return;
      }

      setUserId(profile.id);
      setUserEmail(userEmail);

      setStep('code');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const enteredCode = code.join('');
    if (enteredCode.length !== 4) {
      setError('Please enter the complete 4-digit code.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { data: records, error: selectError } = await supabase
        .from('password_reset_codes')
        .select('*')
        .eq('profile_id', userId)
        .eq('code', enteredCode)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (selectError || !records || records.length === 0) {
        setError('Invalid or expired code. Please try again.');
        setLoading(false);
        return;
      }

      await supabase
        .from('password_reset_codes')
        .delete()
        .eq('id', records[0].id);

      if (!userEmail) {
        setStep('ask_email');
        setLoading(false);
        return;
      }

      const { error: emailError } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/forgot-password%3Fstep%3Dreset`,
      });

      if (emailError) {
        setError('Failed to send reset email. Please try again.');
        setLoading(false);
        return;
      }

      setStep('email_sent');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  async function handleSendEmailLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!userEmail) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: emailError } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/forgot-password%3Fstep%3Dreset`,
      });

      if (emailError) {
        setError('Failed to send reset email. Please try again.');
        setLoading(false);
        return;
      }

      setStep('email_sent');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      setStep('success');
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  function handleCodeChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 3) {
      const next = document.getElementById(`code-${index + 1}`);
      next?.focus();
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prev = document.getElementById(`code-${index - 1}`);
      prev?.focus();
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-cream to-cream-dark">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:scale-105 transition-transform">
              <span className="text-lg font-bold text-farm-green">TheFarmYard</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 'method' && 'Reset Password'}
              {step === 'code' && 'Enter Reset Code'}
              {step === 'ask_email' && 'Enter Your Email'}
              {step === 'email_sent' && 'Check Your Email'}
              {step === 'reset' && 'Choose New Password'}
              {step === 'success' && 'Password Reset!'}
            </h1>
            <p className="text-gray-500 mt-1">
              {step === 'method' && (method === 'email' ? 'A code will be sent to your email' : 'A reset link will be sent to your registered email')}
              {step === 'code' && `A 4-digit code was sent to ${maskContact(contact, method)}`}
              {step === 'ask_email' && 'We need your email to send the password reset link'}
              {step === 'email_sent' && 'A password reset link has been sent to your email'}
              {step === 'reset' && 'Enter your new password below'}
              {step === 'success' && 'Redirecting to login...'}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2 animate-fade-in">
                <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold shrink-0">✕</span>
                {error}
              </div>
            )}

            {step === 'method' && (
              <form onSubmit={handleSendCode} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reset via</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { setMethod('email'); setContact(''); }}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        method === 'email' ? 'border-farm-green bg-farm-green text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
                      }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      Email
                    </button>
                    <button type="button" onClick={() => { setMethod('phone'); setContact(''); }}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        method === 'phone' ? 'border-farm-green bg-farm-green text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
                      }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      Phone
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {method === 'email' ? 'Email Address' : 'Phone Number'}
                  </label>
                  {method === 'email' ? (
                    <input type="email" value={contact} onChange={(e) => setContact(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
                  ) : (
                    <PhoneInput value={contact} onChange={setContact} required />
                  )}
                </div>

                <button type="submit" disabled={loading || !contact}
                  className="w-full py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98]">
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</span> : (method === 'email' ? 'Send Reset Code' : 'Send Reset Link')}
                </button>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 text-center">Enter 4-digit code</label>
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {code.map((digit, i) => (
                      <input key={i} id={`code-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-farm-green bg-white"
                        required />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading || code.join('').length !== 4}
                  className="w-full py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98]">
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</span> : 'Verify Code'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Didn&apos;t receive it?{' '}
                  <button type="button" onClick={() => setStep('method')} className="text-farm-green font-semibold hover:underline">
                    Try again
                  </button>
                </p>
              </form>
            )}

            {step === 'ask_email' && (
              <form onSubmit={handleSendEmailLink} className="space-y-5">
                <p className="text-sm text-gray-600 text-center mb-2">Enter the email address associated with your account to receive the password reset link.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
                </div>
                <button type="submit" disabled={loading || !userEmail}
                  className="w-full py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98]">
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</span> : 'Send Reset Link'}
                </button>
              </form>
            )}

            {step === 'email_sent' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-farm-green/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium mb-1">Password reset link sent</p>
                <p className="text-gray-500 text-sm mb-6">Check your email inbox and click the link to reset your password.</p>
                <Link href="/login" className="text-farm-green font-semibold text-sm hover:underline">
                  Back to Sign In
                </Link>
              </div>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters" minLength={6}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password" minLength={6}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
                </div>
                <p className="text-xs text-gray-400">You are in recovery mode. Set a new password for your account.</p>

                <button type="submit" disabled={loading || !newPassword || !confirmPassword}
                  className="w-full py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98]">
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting...</span> : 'Reset Password'}
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600 text-sm">Your password has been reset successfully.</p>
                <p className="text-gray-400 text-xs mt-1">Redirecting to login...</p>
              </div>
            )}
          </div>

          {step !== 'email_sent' && step !== 'success' && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Remember your password?{' '}
              <Link href="/login" className="text-farm-green font-semibold hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
