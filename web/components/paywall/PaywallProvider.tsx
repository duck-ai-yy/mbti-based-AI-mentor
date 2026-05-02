'use client';

import { useCallback, useEffect, useState } from 'react';
import { PaywallModal } from './PaywallModal';

export function usePaywall() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, open, close };
}

export function PaywallProvider() {
  const { isOpen, open, close } = usePaywall();

  useEffect(() => {
    const handler = () => open();
    window.addEventListener('quota:exhausted', handler);
    return () => window.removeEventListener('quota:exhausted', handler);
  }, [open]);

  return <PaywallModal open={isOpen} onClose={close} />;
}

export default PaywallProvider;
