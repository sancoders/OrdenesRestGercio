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

export function useWaiterCalls() {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const fetchCalls = async () => {
      try {
        console.log('[v0] Fetching waiter calls from Supabase...');
        const { data, error: fetchError } = await supabase
          .from('waiter_calls')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('[v0] Fetch error:', fetchError);
          throw fetchError;
        }

        if (!isMounted) return;

        console.log('[v0] Waiter calls fetched:', data);

        if (data) {
          const mappedCalls: WaiterCall[] = data.map((row: any) => ({
            id: String(row.id),
            table: row.table_id || 0,
            reason: mapReason(row.reason || row.motivo || ''),
            message: row.message || row.mensaje || undefined,
            createdAt: row.created_at,
            acknowledged: row.acknowledged === true || row.atendido === true,
          }));
          setCalls(mappedCalls);
        }
      } catch (err: any) {
        console.error('[v0] Error fetching waiter calls:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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
        (payload: any) => {
          if (!isMounted) return;

          console.log('[v0] Waiter call change:', payload);

          if (payload.eventType === 'INSERT') {
            const row = payload.new;
            const newCall: WaiterCall = {
              id: String(row.id),
              table: row.table_id || 0,
              reason: mapReason(row.reason || row.motivo || ''),
              message: row.message || row.mensaje || undefined,
              createdAt: row.created_at,
              acknowledged: row.acknowledged === true || row.atendido === true,
            };
            setCalls((prev) => [newCall, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            setCalls((prev) =>
              prev.map((call) =>
                String(call.id) === String(row.id)
                  ? {
                      ...call,
                      acknowledged: row.acknowledged === true || row.atendido === true,
                      message: row.message || row.mensaje || call.message,
                    }
                  : call
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old;
            setCalls((prev) => prev.filter((call) => String(call.id) !== String(row.id)));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const acknowledgeCall = useCallback(
    async (callId: string) => {
      const supabase = createClient();

      // Optimistic update
      setCalls((prev) =>
        prev.map((call) =>
          String(call.id) === String(callId) ? { ...call, acknowledged: true } : call
        )
      );

      // Update in database
      const { error } = await supabase
        .from('waiter_calls')
        .update({ acknowledged: true })
        .eq('id', callId);

      if (error) {
        console.error('[v0] Error acknowledging call:', error);
        // Revert on error
        setCalls((prev) =>
          prev.map((call) =>
            String(call.id) === String(callId) ? { ...call, acknowledged: false } : call
          )
        );
      }
    },
    []
  );

  const removeCall = useCallback(
    async (callId: string) => {
      const supabase = createClient();

      // Optimistic update
      setCalls((prev) => prev.filter((call) => String(call.id) !== String(callId)));

      // Delete from database
      const { error } = await supabase
        .from('waiter_calls')
        .delete()
        .eq('id', callId);

      if (error) {
        console.error('[v0] Error deleting call:', error);
      }
    },
    []
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
