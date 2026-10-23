import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Server,
  Zap,
  Globe,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NeumoButton } from '../components/ui/NeumoButton';
import { NeumoCard } from '../components/ui/NeumoCard';
import { NeumoInput } from '../components/ui/NeumoInput';
import { StatusLED } from '../components/ui/StatusLED';

interface AuthPageProps {
  onBypassDemo?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBypassDemo }) => {
  const { signIn, signUp, isConfigured, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        // Successful login triggers onAuthStateChange -> redirects to dashboard
      } else {
        await signUp(email.trim(), password, displayName.trim());
        setSuccessMsg(
          'Registration request submitted! If email confirmation is enabled on your Supabase project, check your inbox to activate your account. Otherwise, you can now log in.'
        );
        setMode('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err.message || 'Authentication failed. Please verify your credentials.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#202226] flex flex-col items-center justify-center p-4 text-slate-100 select-none">
      {/* Background radial gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00bfff]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#00ff88]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#292b30] shadow-[4px_4px_8px_rgba(0,0,0,0.5),-4px_-4px_8px_rgba(255,255,255,0.06)] border border-white/[0.04]">
            <StatusLED status="cyan" size="sm" />
            <span className="font-black text-sm tracking-widest text-slate-100 uppercase">
              RELAY
            </span>
            <span className="text-[10px] font-mono font-bold text-[#00bfff] bg-[#222428] px-1.5 py-0.5 rounded shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
              AUTOMATION
            </span>
          </div>
          <h1 className="text-xl font-black tracking-wide text-slate-100">
            {mode === 'login' ? 'Sign In to Relay' : 'Create Relay Account'}
          </h1>
          <p className="text-xs text-slate-400">
            {mode === 'login'
              ? 'Access visual workflow builder, API connectors & integrations'
              : 'Deploy civic automations, connect CityPulse & collaborate live'}
          </p>
        </div>

        {/* Configuration Notice if Supabase Auth is missing */}
        {!isConfigured && (
          <NeumoCard variant="recess" className="p-4 space-y-3 border border-amber-500/20">
            <div className="flex items-start gap-2.5 text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Supabase Authentication Not Configured</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              The frontend requires your Supabase project keys to authenticate users. To enable live login and signup, configure these environment variables in your deployment:
            </p>
            <div className="p-2.5 rounded-lg bg-[#1a1c20] text-[10px] font-mono text-slate-300 border border-white/[0.03] space-y-1">
              <div><span className="text-amber-400">VITE_SUPABASE_URL</span>=https://&lt;your-id&gt;.supabase.co</div>
              <div><span className="text-amber-400">VITE_SUPABASE_ANON_KEY</span>=eyJhbGci...</div>
            </div>
            {onBypassDemo && (
              <div className="pt-1">
                <NeumoButton
                  type="button"
                  onClick={onBypassDemo}
                  size="sm"
                  className="w-full text-xs font-bold text-[#00bfff]"
                  icon={<Layers className="w-3.5 h-3.5 text-[#00bfff]" />}
                >
                  Enter Offline Workspace (Local Demo)
                </NeumoButton>
              </div>
            )}
          </NeumoCard>
        )}

        {/* Auth Form Card */}
        <NeumoCard variant="protrude" className="p-6 space-y-5">
          {/* Tabs: Login vs Signup */}
          <div className="p-1 rounded-xl bg-[#24262b] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] border border-white/[0.03] flex gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all ${
                mode === 'login'
                  ? 'bg-[#292b30] text-[#00bfff] shadow-[2px_2px_4px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.08)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>SIGN IN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-all ${
                mode === 'signup'
                  ? 'bg-[#292b30] text-[#00ff88] shadow-[2px_2px_4px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.08)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>SIGN UP</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/30 text-[#ff5580] text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <NeumoInput
                label="Full Name / Display Name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Morgan"
              />
            )}

            <NeumoInput
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />

            <div className="relative">
              <NeumoInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {mode === 'signup' && (
              <NeumoInput
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            )}

            <div className="pt-2">
              <NeumoButton
                type="submit"
                disabled={submitting || authLoading || !isConfigured}
                variant="primary"
                size="md"
                className="w-full font-bold tracking-wide"
                icon={
                  submitting || authLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#00bfff]" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-[#00bfff]" />
                  )
                }
              >
                {submitting
                  ? mode === 'login'
                    ? 'Authenticating...'
                    : 'Creating Account...'
                  : !isConfigured
                  ? 'Supabase Keys Required'
                  : mode === 'login'
                  ? 'Sign In to Workspace'
                  : 'Complete Registration'}
              </NeumoButton>
            </div>
          </form>
        </NeumoCard>

        {/* Security Plaque */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00ff88]" />
          <span>Secured with Supabase PostgreSQL & Row Level Security</span>
        </div>
      </div>
    </div>
  );
};
