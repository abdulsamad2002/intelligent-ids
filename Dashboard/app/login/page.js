"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        // Store token and user info
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <Shield size={32} className="text-black" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Guardian IDS</h1>
          <p className="text-neutral-400 text-sm">Intrusion Detection System</p>
        </div>

        {/* Login Form */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8">
          <h2 className="text-xl font-light text-white mb-6">Sign In</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm text-neutral-400 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-neutral-400 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black rounded font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p className="text-xs text-neutral-500 text-center">
              Default credentials: <span className="text-neutral-400">admin / admin123</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-neutral-600">
            Guardian IDS v1.0 - Secure Network Monitoring
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
