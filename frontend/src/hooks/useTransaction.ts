import { useState, useCallback } from 'react';

interface TransactionState<T = unknown> {
  isLoading: boolean;
  error: string | null;
  data: T | null;
}

interface UseTransactionReturn<T> extends TransactionState<T> {
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for managing Stellar transaction states.
 *
 * Provides loading indicators, error messages, and success data
 * for any async transaction — especially useful for Stellar
 * operations that take 3-5 seconds to confirm.
 */
export function useTransaction<T = unknown>(): UseTransactionReturn<T> {
  const [state, setState] = useState<TransactionState<T>>({
    isLoading: false,
    error: null,
    data: null,
  });

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    setState({ isLoading: true, error: null, data: null });
    try {
      const result = await fn();
      setState({ isLoading: false, error: null, data: result });
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Transaction failed. Please try again.';
      setState({ isLoading: false, error: message, data: null });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, data: null });
  }, []);

  return { ...state, execute, reset };
}
