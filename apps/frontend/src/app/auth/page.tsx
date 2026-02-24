'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const handleLogin = async (data: LoginForm) => {
    try {
      setError('')
      const res = await api.post('/auth/login', data)
      const profile = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${res.data.accessToken}` },
      })
      setAuth(profile.data, res.data.accessToken, res.data.refreshToken)
      router.push('/generate')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Login failed')
    }
  }

  const handleRegister = async (data: RegisterForm) => {
    try {
      setError('')
      const res = await api.post('/auth/register', data)
      const profile = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${res.data.accessToken}` },
      })
      setAuth(profile.data, res.data.accessToken, res.data.refreshToken)
      router.push('/generate')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              PhotoGen AI
            </h1>
          </div>
          <p className="text-gray-400">Professional AI Fashion Photography</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex gap-2 mb-6 bg-gray-800 rounded-xl p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  mode === m ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <input
                    {...loginForm.register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-red-400 text-xs mt-1">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      {...loginForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 font-medium transition flex items-center justify-center gap-2"
                >
                  {loginForm.formState.isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                  Sign In
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={registerForm.handleSubmit(handleRegister)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
                  <input
                    {...registerForm.register('name')}
                    placeholder="Jane Doe"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <input
                    {...registerForm.register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      {...registerForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={registerForm.formState.isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 font-medium transition flex items-center justify-center gap-2"
                >
                  {registerForm.formState.isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                  Create Account
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
