'use client';

import { useState, useEffect, useCallback } from 'react';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  table: number;
  items: OrderItem[];
  status: 'pending' | 'cooking' | 'ready';
  createdAt: Date;
  updatedAt: Date;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate fetching orders from API/database
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Replace with actual API call when available
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setOrders(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching orders:', err);
        // For demo, use mock data
        setOrders(generateMockOrders());
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const updateOrderStatus = useCallback(
    (orderId: string, status: 'pending' | 'cooking' | 'ready') => {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status, updatedAt: new Date() }
            : order
        )
      );
    },
    []
  );

  const removeOrder = useCallback((orderId: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
  }, []);

  return {
    orders,
    loading,
    error,
    updateOrderStatus,
    removeOrder,
  };
}

function generateMockOrders(): Order[] {
  return [
    {
      id: '1',
      table: 1,
      items: [
        { id: 'i1', name: 'Hamburguesa', quantity: 2, notes: 'Sin cebolla' },
        { id: 'i2', name: 'Papas fritas', quantity: 2 },
      ],
      status: 'pending',
      createdAt: new Date(Date.now() - 5 * 60000),
      updatedAt: new Date(Date.now() - 5 * 60000),
    },
    {
      id: '2',
      table: 3,
      items: [
        { id: 'i3', name: 'Pizza Margherita', quantity: 1 },
        { id: 'i4', name: 'Refresco', quantity: 2 },
      ],
      status: 'cooking',
      createdAt: new Date(Date.now() - 10 * 60000),
      updatedAt: new Date(Date.now() - 2 * 60000),
    },
    {
      id: '3',
      table: 5,
      items: [
        { id: 'i5', name: 'Filete con papas', quantity: 1 },
        { id: 'i6', name: 'Ensalada', quantity: 1 },
      ],
      status: 'ready',
      createdAt: new Date(Date.now() - 15 * 60000),
      updatedAt: new Date(Date.now() - 1 * 60000),
    },
  ];
}
