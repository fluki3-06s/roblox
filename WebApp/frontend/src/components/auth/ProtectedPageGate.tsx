'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

export function ProtectedPageGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, authReady } = useAuth();

  useEffect(() => {
    if (authReady && !profile) {
      router.replace('/?auth=required');
    }
  }, [authReady, profile, router]);

  if (!authReady || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="w-8 h-8 text-white/65 animate-spin" strokeWidth={1.8} />
      </div>
    );
  }

  return <>{children}</>;
}
