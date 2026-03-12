'use client';

import { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useWaiterCalls } from '@/hooks/useWaiterCalls';
import { useSoundNotification } from '@/hooks/useSoundNotification';
import { OrderCard } from '@/components/OrderCard';
import { WaiterCallsDisplay } from '@/components/WaiterCallsDisplay';
import { ChefHat } from 'lucide-react';

const ORDERS_PER_PAGE = 6;
const PAGE_ROTATION_INTERVAL = 15000; // 15 seconds

export default function KitchenDisplay() {
  const { orders, updateOrderStatus, removeOrder } = useOrders();
  const { calls, acknowledgeCall, removeCall } = useWaiterCalls();
  const { playSound } = useSoundNotification();

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Calculate total pages
  useEffect(() => {
    const total = Math.ceil(orders.length / ORDERS_PER_PAGE) || 1;
    setTotalPages(total);
    if (currentPage >= total) {
      setCurrentPage(0);
    }
  }, [orders.length, currentPage]);

  // Auto-rotate pages
  useEffect(() => {
    if (totalPages <= 1) return;

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, PAGE_ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [totalPages]);

  // Get current page orders
  const startIndex = currentPage * ORDERS_PER_PAGE;
  const endIndex = startIndex + ORDERS_PER_PAGE;
  const currentOrders = orders.slice(startIndex, endIndex);

  const handleStatusChange = (orderId: string, status: 'pending' | 'cooking' | 'ready') => {
    updateOrderStatus(orderId, status);
    playSound('order');
  };

  const handleRemoveOrder = (orderId: string) => {
    removeOrder(orderId);
  };

  const handleAcknowledgeCall = (callId: string) => {
    acknowledgeCall(callId);
    playSound('call');
  };

  const unacknowledgedCalls = calls.filter((c) => !c.acknowledged);

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-lg">
              <ChefHat className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Pantalla de Cocina</h1>
              <p className="text-muted-foreground text-sm">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} • 
                {unacknowledgedCalls.length > 0 && (
                  <span className="text-red-400 font-semibold ml-1">
                    {unacknowledgedCalls.length} llamadas sin atender
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Page indicator */}
          {totalPages > 1 && (
            <div className="text-2xl font-bold text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </div>
          )}
        </div>

        {/* Orders Grid */}
        <div className="mb-8">
          {currentOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onRemove={handleRemoveOrder}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-2xl font-semibold text-muted-foreground">
                No hay pedidos pendientes
              </p>
            </div>
          )}
        </div>

        {/* Waiter Calls Section */}
        {(calls.length > 0 || unacknowledgedCalls.length > 0) && (
          <div className="border-t border-border pt-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  unacknowledgedCalls.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                }`}
              ></div>
              Llamadas del Mozo
              {unacknowledgedCalls.length > 0 && (
                <span className="text-red-500 text-lg">({unacknowledgedCalls.length})</span>
              )}
            </h2>
            <WaiterCallsDisplay
              calls={calls}
              onAcknowledge={handleAcknowledgeCall}
              onRemove={removeCall}
            />
          </div>
        )}
      </div>
    </main>
  );
}
