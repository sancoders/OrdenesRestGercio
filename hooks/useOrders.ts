'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  order_id: number;
  table: number;
  items: OrderItem[];
  status: 'pending' | 'cooking' | 'ready';
  createdAt: string; // Format: HH:MM:SS
  rawTimestamp: string;
}

// Map Supabase estado to our status
function mapEstado(estado: string): 'pending' | 'cooking' | 'ready' {
  const estadoLower = estado?.toLowerCase() || '';
  if (estadoLower === 'listo' || estadoLower === 'ready' || estadoLower === 'entregado') {
    return 'ready';
  }
  if (estadoLower === 'cocinando' || estadoLower === 'cooking' || estadoLower === 'en cocina') {
    return 'cooking';
  }
  return 'pending';
}

// Map our status back to Supabase estado
function mapStatusToEstado(status: 'pending' | 'cooking' | 'ready'): string {
  switch (status) {
    case 'ready':
      return 'listo';
    case 'cooking':
      return 'cocinando';
    default:
      return 'pendiente';
  }
}

// Format timestamp to HH:MM:SS with -3 hours offset
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  // Subtract 3 hours
  date.setHours(date.getHours() - 3);
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

// Parse items from JSON or array
function parseItems(items: any): OrderItem[] {
  if (!items) return [];
  
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          id: item.id || String(idx),
          name: item.name || item.nombre || item || 'Item',
          quantity: item.quantity || item.cantidad || 1,
          notes: item.notes || item.notas || '',
        }));
      }
      return [];
    } catch {
      return [];
    }
  }
  
  if (Array.isArray(items)) {
    return items.map((item: any, idx: number) => ({
      id: item.id || String(idx),
      name: item.name || item.nombre || String(item) || 'Item',
      quantity: item.quantity || item.cantidad || 1,
      notes: item.notes || item.notas || '',
    }));
  }
  
  return [];
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial orders and subscribe to changes
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const fetchOrders = async () => {
      try {
        console.log('[v0] Fetching orders from Supabase...');
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('[v0] Fetch error:', fetchError);
          throw fetchError;
        }

        if (!isMounted) return;

        console.log('[v0] Orders fetched:', data);

        if (data) {
          const mappedOrders: Order[] = data.map((row: any) => ({
            id: String(row.id),
            order_id: row.order_id || row.id,
            table: row.table_id || 0,
            items: parseItems(row.items),
            status: mapEstado(row.estado),
            createdAt: formatTimestamp(row.created_at),
            rawTimestamp: row.created_at,
          }));
          setOrders(mappedOrders);
        }
        setError(null);
      } catch (err: any) {
        console.error('[v0] Error fetching orders:', err);
        if (isMounted) {
          setError('Error al cargar pedidos');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          if (!isMounted) return;

          console.log('[v0] Order change:', payload);

          if (payload.eventType === 'INSERT') {
            const newOrder: Order = {
              id: String(payload.new.id),
              order_id: payload.new.order_id || payload.new.id,
              table: payload.new.table_id || 0,
              items: parseItems(payload.new.items),
              status: mapEstado(payload.new.estado),
              createdAt: formatTimestamp(payload.new.created_at),
              rawTimestamp: payload.new.created_at,
            };
            setOrders((prev) => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((order) => {
                if (String(order.id) === String(payload.new.id)) {
                  return {
                    ...order,
                    items: parseItems(payload.new.items),
                    status: mapEstado(payload.new.estado),
                    createdAt: formatTimestamp(payload.new.created_at),
                  };
                }
                return order;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) =>
              prev.filter((order) => String(order.id) !== String(payload.old.id))
            );
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: 'pending' | 'cooking' | 'ready') => {
      const supabase = createClient();

      // Optimistic update
      setOrders((prev) =>
        prev.map((order) =>
          String(order.id) === String(orderId) ? { ...order, status } : order
        )
      );

      // Update in database
      const { error: updateError } = await supabase
        .from('orders')
        .update({ estado: mapStatusToEstado(status) })
        .eq('id', orderId);

      if (updateError) {
        console.error('[v0] Error updating order:', updateError);
        // Revert optimistic update
        setOrders((prev) =>
          prev.map((order) =>
            String(order.id) === String(orderId)
              ? { ...order, status: mapEstado(mapStatusToEstado(status)) }
              : order
          )
        );
      }
    },
    []
  );

  const removeOrder = useCallback(
    async (orderId: string) => {
      const supabase = createClient();

      // Optimistic update
      setOrders((prev) => prev.filter((order) => String(order.id) !== String(orderId)));

      // Delete from database
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (deleteError) {
        console.error('[v0] Error deleting order:', deleteError);
        // The subscription will handle re-fetching if needed
      }
    },
    []
  );

  return {
    orders,
    loading,
    error,
    updateOrderStatus,
    removeOrder,
  };
}
