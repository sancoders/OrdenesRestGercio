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
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Parse items from database (could be JSON string or array)
function parseItems(items: unknown): OrderItem[] {
  if (!items) return [];
  
  let parsed: unknown[];
  if (typeof items === 'string') {
    try {
      parsed = JSON.parse(items);
    } catch {
      // If it's a simple string, treat it as a single item
      return [{ id: '1', name: items, quantity: 1 }];
    }
  } else if (Array.isArray(items)) {
    parsed = items;
  } else {
    return [];
  }

  return parsed.map((item: unknown, index: number) => {
    if (typeof item === 'string') {
      return { id: String(index + 1), name: item, quantity: 1 };
    }
    const itemObj = item as Record<string, unknown>;
    return {
      id: String(itemObj.id || index + 1),
      name: String(itemObj.name || itemObj.nombre || 'Item'),
      quantity: Number(itemObj.quantity || itemObj.cantidad || 1),
      notes: itemObj.notes || itemObj.notas ? String(itemObj.notes || itemObj.notas) : undefined,
    };
  });
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch initial orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .order('timestampz', { ascending: false });

        if (fetchError) throw fetchError;

        const mappedOrders: Order[] = (data || []).map((row) => ({
          id: String(row.id),
          order_id: row.order_id || row.id,
          table: row.table_id || 0,
          items: parseItems(row.items),
          status: mapEstado(row.estado),
          createdAt: formatTimestamp(row.timestampz),
          rawTimestamp: row.timestampz,
        }));

        setOrders(mappedOrders);
        setError(null);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Error al cargar pedidos');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Set up real-time subscription
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new;
            const newOrder: Order = {
              id: String(row.id),
              order_id: row.order_id || row.id,
              table: row.table_id || 0,
              items: parseItems(row.items),
              status: mapEstado(row.estado),
              createdAt: formatTimestamp(row.timestampz),
              rawTimestamp: row.timestampz,
            };
            setOrders((prev) => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            setOrders((prev) =>
              prev.map((order) =>
                order.id === String(row.id)
                  ? {
                      ...order,
                      items: parseItems(row.items),
                      status: mapEstado(row.estado),
                      table: row.table_id || order.table,
                    }
                  : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old;
            setOrders((prev) => prev.filter((order) => order.id !== String(row.id)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: 'pending' | 'cooking' | 'ready') => {
      // Optimistic update
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );

      // Update in database
      const { error: updateError } = await supabase
        .from('orders')
        .update({ estado: mapStatusToEstado(status) })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order status:', updateError);
        // Revert on error - refetch
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        if (data) {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === orderId
                ? { ...order, status: mapEstado(data.estado) }
                : order
            )
          );
        }
      }
    },
    [supabase]
  );

  const removeOrder = useCallback(
    async (orderId: string) => {
      // Optimistic update
      setOrders((prev) => prev.filter((order) => order.id !== orderId));

      // Delete from database
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (deleteError) {
        console.error('Error deleting order:', deleteError);
        // Refetch orders on error
        const { data } = await supabase
          .from('orders')
          .select('*')
          .order('timestampz', { ascending: false });
        if (data) {
          const mappedOrders: Order[] = data.map((row) => ({
            id: String(row.id),
            order_id: row.order_id || row.id,
            table: row.table_id || 0,
            items: parseItems(row.items),
            status: mapEstado(row.estado),
            createdAt: formatTimestamp(row.timestampz),
            rawTimestamp: row.timestampz,
          }));
          setOrders(mappedOrders);
        }
      }
    },
    [supabase]
  );

  return {
    orders,
    loading,
    error,
    updateOrderStatus,
    removeOrder,
  };
}
