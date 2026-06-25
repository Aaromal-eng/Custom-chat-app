import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MessageSquareLock, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react'
import Chat from './Chat.jsx'

// ─── Supabase client ────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ─── Google SVG icon ────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

// ─── Animated background orbs ───────────────────────────────────────────────
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7c6aff 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 -right-48 w-80 h-80 rounded-full opacity-10 blur-3xl animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, #a594ff 0%, transparent 70%)' }} />
      <div className="absolute -bottom-24 left-1/3 w-64 h-64 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6355cc 0%, transparent 70%)' }} />
    </div>
  )
}

// ─── Feature pill ───────────────────────────────────────────────────────────
function Pill({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 bg-elevated border border-border rounded-full px-3 py-1 text-xs text-text-secondary">
      <Icon size={11} className="text-accent" />
      {label}
    </div>
  )
}

// ─── Login card ─────────────────────────────────────────────────────────────
function LoginCard({ onLogin }) {
  const [mode, setMode] = useState('main') // 'main' | 'email'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleEmailBypass(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Enter an email or username.'); return }
    setLoading(true)
    setError('')

    // Normalise: if no @ treat as user@cipher.local
    const normalised = email.includes('@') ? email.trim() : `${email.trim()}@cipher.local`
    const pass = password.trim() || 'cipher-bypass-2025'

    // Try sign-in first; if user doesn't exist, sign up (confirm email is OFF)
    let { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: normalised, password: pass,
    })

    if (signInErr) {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: normalised, password: pass,
        options: { data: { display_name: email.trim().split('@')[0] } },
      })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      data = signUpData
    }

    if (data?.user) onLogin(data.user)
    else setError('Auth failed — check Supabase settings.')
    setLoading(false)
  }

  return (
    <div className="relative z-10 w-full max-w-sm mx-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-4 shadow-glow">
          <MessageSquareLock size={26} className="text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Cipher</h1>
        <p className="text-sm text-text-secondary mt-1">Encrypted. Instant. Yours.</p>
      </div>

      {/* Pill badges */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        <Pill icon={Shield} label="End-to-end" />
        <Pill icon={Zap} label="Real-time" />
        <Pill icon={MessageSquareLock} label="Private rooms" />
      </div>

      {/* Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-card animate-slide-up">
        {mode === 'main' && (
          <div className="space-y-3">
            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 rounded-xl transition-all duration-200 text-sm disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-dim">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button onClick={() => setMode('email')}
              className="btn-ghost w-full border border-border text-text-secondary hover:text-text-primary">
              <Zap size={14} className="text-accent" />
              Email / Username Bypass
              <ArrowRight size={13} className="ml-auto" />
            </button>
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={handleEmailBypass} className="space-y-3 animate-fade-in">
            <button type="button" onClick={() => { setMode('main'); setError('') }}
              className="text-xs text-text-dim hover:text-text-secondary flex items-center gap-1 mb-1">
              ← Back
            </button>
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Email or Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="you@example.com or just 'Aaromal'"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">
                Password <span className="text-text-dim">(optional — auto-set if blank)</span>
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Leave blank for auto"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {loading ? 'Connecting…' : 'Enter Cipher'}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 animate-fade-in">
            {error}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-text-dim mt-5">
        By continuing you agree to Cipher's terms & privacy policy.
      </p>
    </div>
  )
}

// ─── App root ────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center animate-pulse-slow shadow-glow">
            <MessageSquareLock size={20} className="text-accent" />
          </div>
          <p className="text-xs text-text-dim">Loading…</p>
        </div>
      </div>
    )
  }

  if (session?.user) {
    return (
      <Chat
        user={session.user}
        onSignOut={handleSignOut}
        supabase={supabase}
      />
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 bg-void relative overflow-hidden">
      <BackgroundOrbs />
      <LoginCard onLogin={() => {}} />
    </div>
  )
}
