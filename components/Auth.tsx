import React, { useState, useEffect } from 'react';
import { supabase, checkSupabaseConfig, supabaseConfigDebug } from '../services/supabase';
import { Button } from './Button';
import { BookOpen, Mail, Lock, AlertCircle, Settings, Check, X, KeyRound, ArrowLeft, Sparkles } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 0, 0)">
      <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1Z" fill="#4285F4"/>
    </g>
  </svg>
);

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check configuration immediately
  const configError = checkSupabaseConfig();

  // Listen for password recovery event and deep links
  useEffect(() => {
    // Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPassword(true);
        setIsForgotPassword(false);
        setIsSignUp(false);
      }
    });

    // Check URL hash for recovery token (web browsers)
    const checkUrlForRecovery = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const fullUrl = window.location.href;
      
      console.log('Checking URL for recovery:', { hash, search, fullUrl });
      
      // Check hash parameters (Supabase default)
      if (hash && (hash.includes('type=recovery') || hash.includes('type=signup'))) {
        if (hash.includes('type=recovery')) {
          setIsResetPassword(true);
        }
        return;
      }
      
      // Check query parameters (alternative format)
      if (search && search.includes('type=recovery')) {
        setIsResetPassword(true);
        return;
      }
      
      // Check for access_token in hash (indicates auth callback)
      if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
        setIsResetPassword(true);
      }
    };

    checkUrlForRecovery();

    // Handle deep links on native platforms (Capacitor)
    if (Capacitor.isNativePlatform()) {
      // Check if app was opened with a URL
      CapacitorApp.getLaunchUrl().then((result) => {
        if (result?.url) {
          console.log('App launched with URL:', result.url);
          handleDeepLink(result.url);
        }
      });

      // Listen for app URL open events (when app is already running)
      const urlListener = CapacitorApp.addListener('appUrlOpen', (data) => {
        console.log('App URL opened:', data.url);
        handleDeepLink(data.url);
      });

      return () => {
        subscription.unsubscribe();
        urlListener.then(l => l.remove());
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  // Handle deep link URLs
  const handleDeepLink = async (url: string) => {
    console.log('Processing deep link:', url);
    
    // Extract tokens from URL
    const urlObj = new URL(url);
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    const searchParams = urlObj.searchParams;
    
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    const type = hashParams.get('type') || searchParams.get('type');
    
    console.log('Deep link params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
    
    if (type === 'recovery' && accessToken) {
      // Set the session with the tokens from the URL
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
      
      if (!error) {
        setIsResetPassword(true);
        setIsForgotPassword(false);
        setIsSignUp(false);
      } else {
        console.error('Error setting session from deep link:', error);
        setError('Invalid or expired reset link. Please request a new one.');
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isResetPassword) {
        // Validate passwords match
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        
        setMessage("Password updated successfully! You can now sign in.");
        setIsResetPassword(false);
        setPassword('');
        setConfirmPassword('');
      } else if (isForgotPassword) {
        // Use custom scheme for native app, web origin for browser
        const redirectUrl = Capacitor.isNativePlatform() 
          ? 'libris://reset-password'
          : window.location.origin;
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        if (error) throw error;
        setMessage("Password reset link sent! Check your email.");
        setIsForgotPassword(false);
      } else if (isSignUp) {
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

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      // Use custom scheme for native app, web origin for browser
      const redirectUrl = Capacitor.isNativePlatform() 
        ? 'libris://auth'
        : window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Capacitor.isNativePlatform(), // Handle manually on native
        }
      });

      if (error) throw error;

      // On native platforms, open the OAuth URL in the system browser
      if (Capacitor.isNativePlatform() && data?.url) {
        await Browser.open({ url: data.url });
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setError(err.message || "Failed to sign in with Google. Please try again.");
      setGoogleLoading(false);
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

  // Welcome/Onboarding Screen
  if (showWelcome && !isResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Logo & Branding */}
          <div className="w-24 h-24 bg-brand-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-brand-500/30">
            <BookOpen className="text-white h-12 w-12" />
          </div>
          
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Libris</h1>
          
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <p className="text-slate-600 dark:text-slate-400 text-center">
              AI-Powered Book Tracking
            </p>
            <Sparkles className="h-4 w-4 text-brand-500" />
          </div>
          
          <p className="text-slate-500 dark:text-slate-400 text-center mb-12 max-w-xs">
            Track your reading journey, get personalized recommendations, and gain insights into your reading habits.
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <Button 
              onClick={() => { setShowWelcome(false); setIsSignUp(false); }}
              className="w-full py-3 text-base"
            >
              Log In
            </Button>
            
            <Button 
              onClick={() => { setShowWelcome(false); setIsSignUp(true); }}
              variant="outline"
              className="w-full py-3 text-base"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        {/* Back button - only show if not in password reset mode */}
        {!isResetPassword && !isForgotPassword && (
          <button
            onClick={() => setShowWelcome(true)}
            className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 -mt-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <div className="flex flex-col items-center mb-6">
          <div className={`w-12 h-12 ${isResetPassword ? 'bg-amber-500' : 'bg-brand-600'} rounded-xl flex items-center justify-center mb-4 shadow-lg ${isResetPassword ? 'shadow-amber-500/30' : 'shadow-brand-500/30'}`}>
            {isResetPassword ? <KeyRound className="text-white h-7 w-7" /> : <BookOpen className="text-white h-7 w-7" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isResetPassword ? 'Reset Password' : isForgotPassword ? 'Forgot Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-center">
            {isResetPassword 
              ? 'Enter your new password below' 
              : isForgotPassword 
                ? "Enter your email and we'll send you a reset link"
                : isSignUp 
                  ? 'Sign up to start tracking your books'
                  : 'Sign in to continue your reading journey'}
          </p>
        </div>

        {/* Google Sign-In Button - show for login/signup, not for password reset */}
        {!isResetPassword && !isForgotPassword && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-5">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              <span className="text-sm text-slate-400 dark:text-slate-500">or</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Reset Password Form */}
          {isResetPassword ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Email Input - shown for login, signup, and forgot password */
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
          )}

          {!isForgotPassword && !isResetPassword && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
          )}

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
            {isResetPassword ? 'Update Password' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          {isResetPassword ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Changed your mind?
              <button
                onClick={() => {
                  setIsResetPassword(false);
                  setPassword('');
                  setConfirmPassword('');
                  // Clear the hash from URL
                  window.history.replaceState(null, '', window.location.pathname);
                }}
                className="ml-1 text-brand-600 dark:text-brand-400 font-medium hover:underline focus:outline-none"
              >
                Back to Sign In
              </button>
            </p>
          ) : isForgotPassword ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Remember your password?
              <button
                onClick={() => setIsForgotPassword(false)}
                className="ml-1 text-brand-600 dark:text-brand-400 font-medium hover:underline focus:outline-none"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-1 text-brand-600 dark:text-brand-400 font-medium hover:underline focus:outline-none"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};