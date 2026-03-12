'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WaiterCall {
  id: string;
  table: number;
  reason: 'service' | 'payment' | 'complaint' | 'other';
  message?: string;
  createdAt: Date;
  acknowledged: boolean;
}

export function useWaiterCalls() {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/waiter-calls');
        if (!response.ok) throw new Error('Failed to fetch waiter calls');
        const data = await response.json();
        setCalls(data);
      } catch (err) {
        console.error('Error fetching waiter calls:', err);
        setCalls(generateMockCalls());
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, []);

  const acknowledgeCall = useCallback((callId: string) => {
    setCalls((prev) =>
      prev.map((call) =>
        call.id === callId ? { ...call, acknowledged: true } : call
      )
    );
  }, []);

  const removeCall = useCallback((callId: string) => {
    setCalls((prev) => prev.filter((call) => call.id !== callId));
  }, []);

  const unacknowledgedCount = calls.filter((c) => !c.acknowledged).length;

  return {
    calls,
    loading,
    acknowledgeCall,
    removeCall,
    unacknowledgedCount,
  };
}

function generateMockCalls(): WaiterCall[] {
  return [
    {
      id: 'c1',
      table: 2,
      reason: 'service',
      message: 'Necesita refrescos',
      createdAt: new Date(Date.now() - 2 * 60000),
      acknowledged: false,
    },
    {
      id: 'c2',
      table: 4,
      reason: 'payment',
      createdAt: new Date(Date.now() - 5 * 60000),
      acknowledged: true,
    },
  ];
}
