'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type WaiterCallReason = 'water' | 'bread' | 'question' | 'clean' | 'bill' | 'other';

export interface WaiterCall {
  id: string;
  table: string;
  reason: WaiterCallReason;
  message?: string;
  createdAt: string;
  status: 'pendiente' | 'resuelto';
}

const VALID_REASONS: WaiterCallReason[] = ['water', 'bread', 'question', 'clean', 'bill', 'other'];

function mapReason(reason: string): WaiterCallReason {
  const r = reason?.toLowerCase() || '';
  if (VALID_REASONS.includes(r as WaiterCallReason)) return r as WaiterCallReason;
  return 'other';
}

function mapRow(row: any): WaiterCall {
  return {
    id: String(row.id),
    table: String(row.table_id || ''),
    reason: mapReason(row.reason || row.motivo || ''),
    message: row.message || row.mensaje || undefined,
    createdAt: row.created_at,
    status: row.status === 'resuelto' ? 'resuelto' : 'pendiente',
  };
}

export function useWaiterCalls() {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const fetchCalls = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('waiter_calls')
          .select('*')
          .neq('status', 'resuelto')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        if (!isMounted) return;

        if (data) {
          setCalls(data.map(mapRow));
        }
      } catch (err: any) {
        console.error('[v0] Error fetching waiter calls:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCalls();

    const channel = supabase
      .channel('waiter-calls-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waiter_calls' },
        (payload: any) => {
          if (!isMounted) return;

          if (payload.eventType === 'INSERT') {
            const newCall = mapRow(payload.new);
            if (newCall.status !== 'resuelto') {
              setCalls((prev) => [newCall, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRow(payload.new);
            if (updated.status === 'resuelto') {
              // Remove from display when resolved
              setCalls((prev) => prev.filter((c) => String(c.id) !== String(payload.new.id)));
            } else {
              setCalls((prev) =>
                prev.map((c) => (String(c.id) === String(payload.new.id) ? updated : c))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setCalls((prev) => prev.filter((c) => String(c.id) !== String(payload.old.id)));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const resolveCall = useCallback(async (callId: string) => {
    const supabase = createClient();

    // Optimistic update — remove from view immediately
    setCalls((prev) => prev.filter((c) => String(c.id) !== String(callId)));

    const { error } = await supabase
      .from('waiter_calls')
      .update({ status: 'resuelto' })
      .eq('id', callId);

    if (error) {
      console.error('[v0] Error resolving call:', error);
      // Revert: re-fetch to restore state
      const { data } = await supabase
        .from('waiter_calls')
        .select('*')
        .neq('status', 'resuelto')
        .order('created_at', { ascending: false });
      if (data) setCalls(data.map(mapRow));
    }
  }, []);

  const pendingCount = calls.filter((c) => c.status === 'pendiente').length;

  return { calls, loading, resolveCall, pendingCount };
}
