'use client';

import type { ReactNode } from 'react';
import { Web3Provider } from '@/components/providers/Web3Provider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <Web3Provider>{children}</Web3Provider>;
}

