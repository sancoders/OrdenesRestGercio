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
  order_id: string;
  table: string;
  items: OrderItem[];
  status: 'pending' | 'cooking' | 'ready';
  createdAt: string; // Format: HH:MM:SS
  rawTimestamp: string;
}

// Map Supabase status to our status
function mapEstado(status: string): 'pending' | 'cooking' | 'ready' {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'listo' || statusLower === 'ready' || statusLower === 'entregado') {
    return 'ready';
  }
  if (statusLower === 'cocinando' || statusLower === 'cooking' || statusLower === 'en cocina') {
    return 'cooking';
  }
  return 'pending';
}

// Map our status back to webhook estado value
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

// URL del webhook de n8n que persiste el cambio de estado. Va por entorno:
// la instancia se migro de Hostinger a Contabo y el host viejo quedo hardcodeado
// aca, sin resolver por DNS, con el fallo tapado por un catch mudo.
const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

// Avisa a n8n el nuevo estado. Devuelve false si no se pudo confirmar: el
// cambio local es optimista y sin esto se pierde al recargar.
async function notifyStatusChange(payload: {
  order_id: string;
  mesa: string;
  estado: string;
}): Promise<boolean> {
  if (!N8N_WEBHOOK_URL) {
    console.error(
      '[gercio] Falta NEXT_PUBLIC_N8N_WEBHOOK_URL: el cambio de estado no se guarda.'
    );
    return false;
  }

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[gercio] El webhook respondio', res.status);
      return false;
    }
    return true;
  } catch (webhookError) {
    console.error('[gercio] No se pudo avisar al webhook:', webhookError);
    return false;
  }
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
          // Filter out orders with status "entregado"
          const filteredData = data.filter((row: any) => {
            const statusLower = row.status?.toLowerCase() || '';
            return statusLower !== 'entregado' && statusLower !== 'delivered';
          });
          
          const mappedOrders: Order[] = filteredData.map((row: any) => ({
            id: String(row.id),
            order_id: String(row.order_id || row.id),
            table: String(row.table_id || ''),
            items: parseItems(row.items),
            status: mapEstado(row.status),
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
              order_id: String(payload.new.order_id || payload.new.id),
              table: String(payload.new.table_id || ''),
              items: parseItems(payload.new.items),
              status: mapEstado(payload.new.status),
              createdAt: formatTimestamp(payload.new.created_at),
              rawTimestamp: payload.new.created_at,
            };
            setOrders((prev) => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const newStatusLower = payload.new.status?.toLowerCase() || '';
            const isDelivered = newStatusLower === 'entregado' || newStatusLower === 'delivered';
            if (isDelivered) {
              setOrders((prev) =>
                prev.filter((order) => String(order.id) !== String(payload.new.id))
              );
            } else {
              setOrders((prev) =>
                prev.map((order) => {
                  if (String(order.id) === String(payload.new.id)) {
                    return {
                      ...order,
                      items: parseItems(payload.new.items),
                      status: mapEstado(payload.new.status),
                      createdAt: formatTimestamp(payload.new.created_at),
                    };
                  }
                  return order;
                })
              );
            }
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
      // Get the order before updating for webhook data
      const orderToUpdate = orders.find((o) => String(o.id) === String(orderId));

      // Optimistic update (local only)
      setOrders((prev) =>
        prev.map((order) =>
          String(order.id) === String(orderId) ? { ...order, status } : order
        )
      );

      // Send webhook notification - the webhook handles the actual update
      if (orderToUpdate) {
        const ok = await notifyStatusChange({
          order_id: orderToUpdate.order_id,
          mesa: orderToUpdate.table,
          estado: mapStatusToEstado(status),
        });
        if (!ok) {
          setError('No se pudo guardar el cambio de estado. Revisa la conexion.');
        }
      }
    },
    [orders]
  );

  const removeOrder = useCallback(
    async (orderId: string) => {
      // Get the order before removing for webhook data
      const orderToRemove = orders.find((o) => String(o.id) === String(orderId));

      // Optimistic update - remove from local state
      setOrders((prev) => prev.filter((order) => String(order.id) !== String(orderId)));

      // Send webhook with estado "entregado" - don't delete from database
      if (orderToRemove) {
        const ok = await notifyStatusChange({
          order_id: orderToRemove.order_id,
          mesa: orderToRemove.table,
          estado: 'entregado',
        });
        if (!ok) {
          setError('No se pudo marcar el pedido como entregado. Revisa la conexion.');
        }
      }
    },
    [orders]
  );

  return {
    orders,
    loading,
    error,
    updateOrderStatus,
    removeOrder,
  };
}
