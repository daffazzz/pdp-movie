'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, error, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Jika sudah login, redirect ke home atau mylist
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const { data, error } = await signIn(email, password);
    if (error) {
      setFormError(error.message || 'Failed to sign in');
    } else {
      // Berhasil login, redirect ke mylist
      router.push('/mylist');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-white">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 rounded bg-gray-800 text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 rounded bg-gray-800 text-white focus:outline-none"
            />
          </div>
          {(formError || error) && (
            <p className="text-red-500 text-sm">{formError || error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 py-2 rounded text-white font-semibold hover:bg-red-700"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-gray-400 text-sm">
          Belum punya akun?{' '}
          <Link href="/signup" className="text-red-500 hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
} 