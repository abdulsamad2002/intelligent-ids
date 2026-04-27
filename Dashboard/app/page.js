"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    
    if (token) {
      // Redirect to dashboard if authenticated
      router.push('/dashboard');
    } else {
      // Redirect to login if not authenticated
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-center">
        <Shield size={48} className="text-fg mx-auto mb-4 animate-pulse" />
        <Loader2 size={24} className="text-neutral-500 mx-auto animate-spin" />
        <p className="text-neutral-500 mt-4 font-light tracking-widest uppercase text-[10px]">Initializing Intelligent IDS...</p>
      </div>
    </div>
  );
}