'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show spinner while loading or redirecting
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 md:px-16">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <div className="bg-gray-900 p-6 rounded-lg max-w-md">
        <p className="mb-2"><span className="font-semibold">Email:</span> {user.email}</p>
        <p className="mb-4"><span className="font-semibold">Role:</span> {user.user_metadata?.role || 'user'}</p>
        <button
          onClick={async () => { await signOut(); router.push('/'); }}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
} 