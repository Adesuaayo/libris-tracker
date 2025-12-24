import React, { useState } from 'react';
import { supabase, checkSupabaseConfig, supabaseConfigDebug } from '../services/supabase';
import { Button } from './Button';
import { BookOpen, Mail, Lock, AlertCircle, Settings, Check, X } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check configuration immediately
  const configError = checkSupabaseConfig();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      // User-friendly error messages
      const msg = err.message || '';
      if (msg.includes("Invalid API key")) {
        setError("Connection error. Please contact support.");
      } else if (msg.includes("Invalid login credentials")) {
        setError("Incorrect email or password. Please check and try again.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Please check your email and click the confirmation link before signing in.");
      } else if (msg.includes("User already registered")) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (msg.includes("Password should be at least")) {
        setError("Password must be at least 6 characters long.");
      } else if (msg.includes("Unable to validate email")) {
        setError("Please enter a valid email address.");
      } else if (msg.includes("rate limit") || msg.includes("too many requests")) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex justify-center items-center p-4">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-red-200 dark:border-red-900/50 p-8">
            <div className="flex flex-col items-center mb-6 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <Settings className="text-red-600 dark:text-red-400 h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Configuration Required</h1>
                <p className="text-slate-600 dark:text-slate-300 mt-2">
                    Libris needs to connect to Supabase to save your books.
                </p>
            </div>
            
            <div className="space-y-4 mb-6">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-white mb-2">Debug Info (What the app sees):</p>
                    <div className="space-y-2 font-mono text-xs">
                        <div className="flex items-center gap-2">
                             {supabaseConfigDebug.url ? <Check className="text-emerald-500 h-3 w-3" /> : <X className="text-red-500 h-3 w-3" />}
                             <span className="opacity-50">URL:</span> 
                             <span className="truncate">{supabaseConfigDebug.url || 'Missing'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             {supabaseConfigDebug.key ? <Check className="text-emerald-500 h-3 w-3" /> : <X className="text-red-500 h-3 w-3" />}
                             <span className="opacity-50">Key:</span>
                             <span className="break-all">{supabaseConfigDebug.maskedKey}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-bold mb-1">How to fix:</p>
                    <p className="mb-2">Create a <code>.env</code> file in your project root with:</p>
                    <pre className="bg-black/10 dark:bg-black/30 p-2 rounded overflow-x-auto text-xs">
                        VITE_SUPABASE_URL=https://your-project.supabase.co{'\n'}
                        VITE_SUPABASE_ANON_KEY=your-anon-key
                    </pre>
                </div>
            </div>
            
            <Button onClick={() => window.location.reload()} className="w-full">
                Refresh Page
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-brand-500/30">
            <BookOpen className="text-white h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to Libris</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-center">
            Your personal AI-powered reading companion
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
             <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                <div className="flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading} isLoading={loading}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-1 text-brand-600 dark:text-brand-400 font-medium hover:underline focus:outline-none"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};