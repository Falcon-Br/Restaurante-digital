import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'

const roleRedirect: Record<string, string> = {
  Garcom: '/garcom',
  Cozinha: '/cozinha',
  Admin: '/admin',
  Gerente: '/gerente',
}

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      navigate(roleRedirect[user.role] ?? '/admin', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
    } catch {
      toast.error('Email ou senha inválidos.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at top left, #f7f9ff 0%, #eceef4 100%)' }}
    >
      <main
        className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 overflow-hidden"
        style={{
          background: '#ffffff',
          borderRadius: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
          minHeight: '640px',
        }}
      >
        {/* Left panel */}
        <section
          className="hidden md:flex flex-col justify-between p-12 relative overflow-hidden"
          style={{ background: '#eceef4' }}
        >
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div className="flex items-center gap-2 mb-8">
              <span
                className="material-symbols-outlined"
                style={{ color: '#b90014', fontSize: '2.25rem' }}
              >
                restaurant_menu
              </span>
              <h1
                className="text-2xl font-black tracking-tighter"
                style={{ color: '#191c20' }}
              >
                Restaurante Digital
              </h1>
            </div>
            <div className="space-y-6 max-w-sm">
              <h2
                className="text-4xl font-extrabold leading-tight tracking-tight"
                style={{ color: '#191c20' }}
              >
                Precisão em cada{' '}
                <span style={{ color: '#b90014' }}>atendimento.</span>
              </h2>
              <p className="text-lg leading-relaxed" style={{ color: '#5d4037' }}>
                O centro de controle para gestão culinária moderna. Comande sua cozinha,
                equipe e receitas em uma única interface.
              </p>
            </div>
          </div>

          {/* System status badge */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div
              className="flex items-center gap-4 p-4"
              style={{
                borderRadius: '0.75rem',
                background: 'rgba(247,249,255,0.5)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div
                className="h-10 w-10 flex-shrink-0 flex items-center justify-center"
                style={{ borderRadius: '9999px', background: '#428057' }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: '#ffffff',
                    fontSize: '1.25rem',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  check_circle
                </span>
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: '#0e512d' }}
                >
                  Status do Sistema
                </p>
                <p className="text-sm font-medium" style={{ color: '#191c20' }}>
                  Sistema operacional
                </p>
              </div>
            </div>
          </div>

          {/* Decorative blobs */}
          <div
            style={{
              position: 'absolute',
              bottom: '-5rem',
              right: '-5rem',
              width: '20rem',
              height: '20rem',
              background: 'rgba(185,0,20,0.05)',
              borderRadius: '9999px',
              filter: 'blur(48px)',
            }}
          />
        </section>

        {/* Right panel — form */}
        <section
          className="flex flex-col justify-center p-8 md:p-16 lg:p-24"
          style={{ background: '#ffffff' }}
        >
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2 mb-12 justify-center">
            <span
              className="material-symbols-outlined"
              style={{ color: '#b90014', fontSize: '1.875rem' }}
            >
              restaurant_menu
            </span>
            <span
              className="text-xl font-black tracking-tighter"
              style={{ color: '#191c20' }}
            >
              Restaurante Digital
            </span>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h3
              className="text-3xl font-bold tracking-tight mb-2"
              style={{ color: '#191c20' }}
            >
              Bem-vindo
            </h3>
            <p style={{ color: '#5d3f3c' }}>Acesse sua estação de trabalho</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-semibold ml-1"
                style={{ color: '#5d3f3c' }}
              >
                E-mail
              </label>
              <div className="relative" style={{ position: 'relative' }}>
                <div
                  className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                  style={{ paddingLeft: '1rem', color: '#5d3f3c' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    alternate_email
                  </span>
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="nome@restaurante.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="block w-full outline-none transition-all"
                  style={{
                    paddingLeft: '2.75rem',
                    paddingRight: '1rem',
                    paddingTop: '1rem',
                    paddingBottom: '1rem',
                    background: '#f2f3f9',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#191c20',
                    fontSize: '0.875rem',
                  }}
                  onFocus={e => {
                    e.target.style.background = '#ffffff'
                    e.target.style.boxShadow = '0 0 0 2px rgba(185,0,20,0.2)'
                  }}
                  onBlur={e => {
                    e.target.style.background = '#f2f3f9'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold"
                  style={{ color: '#5d3f3c' }}
                >
                  Senha
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <div
                  className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                  style={{ paddingLeft: '1rem', color: '#5d3f3c' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    lock
                  </span>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="block w-full outline-none transition-all"
                  style={{
                    paddingLeft: '2.75rem',
                    paddingRight: '3rem',
                    paddingTop: '1rem',
                    paddingBottom: '1rem',
                    background: '#f2f3f9',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#191c20',
                    fontSize: '0.875rem',
                  }}
                  onFocus={e => {
                    e.target.style.background = '#ffffff'
                    e.target.style.boxShadow = '0 0 0 2px rgba(185,0,20,0.2)'
                  }}
                  onBlur={e => {
                    e.target.style.background = '#f2f3f9'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center transition-colors"
                  style={{ paddingRight: '1rem', color: '#5d3f3c' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #b90014 0%, #e31b23 100%)',
                color: '#ffffff',
                paddingTop: '1rem',
                paddingBottom: '1rem',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 16px rgba(185,0,20,0.2)',
                fontSize: '1rem',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && (
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <footer className="mt-12 text-center md:text-left">
            <div
              className="mt-8 pt-8 flex flex-wrap gap-4 justify-center md:justify-start"
              style={{ borderTop: '1px solid #e6e8ee' }}
            >
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: '#926e6b' }}
              >
                Restaurante Digital
              </span>
              <span style={{ color: '#926e6b' }}>•</span>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: '#926e6b' }}
              >
                Apenas uso interno
              </span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}
