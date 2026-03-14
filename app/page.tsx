'use client';

import { useOrders } from '@/hooks/useOrders';
import { useWaiterCalls } from '@/hooks/useWaiterCalls';
import { useSoundNotification } from '@/hooks/useSoundNotification';
import { OrderCard } from '@/components/OrderCard';
import { WaiterCallsDisplay } from '@/components/WaiterCallsDisplay';
import { ChefHat } from 'lucide-react';

export default function KitchenDisplay() {
  const { orders, updateOrderStatus, removeOrder } = useOrders();
  const { calls, acknowledgeCall, removeCall } = useWaiterCalls();
  const { playSound } = useSoundNotification();

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
    <main className="bg-background text-foreground min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-lg">
              <ChefHat className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold leading-tight">Pantalla de Cocina</h1>
              <p className="text-muted-foreground text-sm">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''}
                {unacknowledgedCalls.length > 0 && (
                  <span className="text-red-400 font-semibold ml-2">
                    · {unacknowledgedCalls.length} llamada{unacknowledgedCalls.length !== 1 ? 's' : ''} sin atender
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Orders Grid — 3 columns, scrollable, min 2 rows visible */}
        <div className="mb-8">
          {orders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
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
        {calls.length > 0 && (
          <div className="border-t border-border pt-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${
                  unacknowledgedCalls.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                }`}
              />
              Llamadas del Mozo
              {unacknowledgedCalls.length > 0 && (
                <span className="text-red-400 text-base font-normal">
                  ({unacknowledgedCalls.length} sin atender)
                </span>
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
