'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WaiterCall {
  id: string;
  table: number;
  reason: 'service' | 'payment' | 'complaint' | 'other';
  message?: string;
  createdAt: string;
  acknowledged: boolean;
}

// Map reason from database
function mapReason(reason: string): 'service' | 'payment' | 'complaint' | 'other' {
  const reasonLower = reason?.toLowerCase() || '';
  if (reasonLower.includes('pago') || reasonLower.includes('cuenta') || reasonLower === 'payment') {
    return 'payment';
  }
  if (reasonLower.includes('queja') || reasonLower.includes('complaint') || reasonLower.includes('reclamo')) {
    return 'complaint';
  }
  if (reasonLower.includes('servicio') || reasonLower.includes('service') || reasonLower.includes('atención')) {
    return 'service';
  }
  return 'other';
}

// Format timestamp with -3 hours offset
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  date.setHours(date.getHours() - 3);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function useWaiterCalls() {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('waiter_calls')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedCalls: WaiterCall[] = (data || []).map((row) => ({
          id: String(row.id),
          table: row.table_id || 0,
          reason: mapReason(row.reason || row.motivo || ''),
          message: row.message || row.mensaje || undefined,
          createdAt: formatTimestamp(row.created_at || row.timestampz),
          acknowledged: row.acknowledged || row.atendido || false,
        }));

        setCalls(mappedCalls);
      } catch (err) {
        console.error('Error fetching waiter calls:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();

    // Set up real-time subscription
    const channel = supabase
      .channel('waiter-calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiter_calls',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new;
            const newCall: WaiterCall = {
              id: String(row.id),
              table: row.table_id || 0,
              reason: mapReason(row.reason || row.motivo || ''),
              message: row.message || row.mensaje || undefined,
              createdAt: formatTimestamp(row.created_at || row.timestampz),
              acknowledged: row.acknowledged || row.atendido || false,
            };
            setCalls((prev) => [newCall, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            setCalls((prev) =>
              prev.map((call) =>
                call.id === String(row.id)
                  ? {
                      ...call,
                      acknowledged: row.acknowledged || row.atendido || false,
                      message: row.message || row.mensaje || call.message,
                    }
                  : call
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old;
            setCalls((prev) => prev.filter((call) => call.id !== String(row.id)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const acknowledgeCall = useCallback(
    async (callId: string) => {
      // Optimistic update
      setCalls((prev) =>
        prev.map((call) =>
          call.id === callId ? { ...call, acknowledged: true } : call
        )
      );

      // Update in database
      const { error } = await supabase
        .from('waiter_calls')
        .update({ acknowledged: true, atendido: true })
        .eq('id', callId);

      if (error) {
        console.error('Error acknowledging call:', error);
        // Revert on error
        setCalls((prev) =>
          prev.map((call) =>
            call.id === callId ? { ...call, acknowledged: false } : call
          )
        );
      }
    },
    [supabase]
  );

  const removeCall = useCallback(
    async (callId: string) => {
      // Optimistic update
      setCalls((prev) => prev.filter((call) => call.id !== callId));

      // Delete from database
      const { error } = await supabase
        .from('waiter_calls')
        .delete()
        .eq('id', callId);

      if (error) {
        console.error('Error deleting call:', error);
      }
    },
    [supabase]
  );

  const unacknowledgedCount = calls.filter((c) => !c.acknowledged).length;

  return {
    calls,
    loading,
    acknowledgeCall,
    removeCall,
    unacknowledgedCount,
  };
}
