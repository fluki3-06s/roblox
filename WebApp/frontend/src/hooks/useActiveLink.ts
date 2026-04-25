'use client';

import { usePathname } from 'next/navigation';

/**
 * Hook to check if a given href matches the current pathname.
 * Handles exact match for home page and startsWith for sub-paths.
 */
export function useActiveLink() {
  const pathname = usePathname();

  return (href: string): boolean => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };
}
