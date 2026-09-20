'use client';

import { useOrders } from '@/hooks/useOrders';
import { useWaiterCalls } from '@/hooks/useWaiterCalls';
import { useSoundNotification } from '@/hooks/useSoundNotification';
import { OrderCard } from '@/components/OrderCard';
import { WaiterCallsDisplay } from '@/components/WaiterCallsDisplay';
import { ChefHat, Bell } from 'lucide-react';

export default function KitchenDisplay() {
  const { orders, updateOrderStatus, removeOrder } = useOrders();
  const { calls, resolveCall, pendingCount } = useWaiterCalls();
  const { playSound } = useSoundNotification();

  const handleStatusChange = (orderId: string, status: 'pending' | 'cooking' | 'ready') => {
    updateOrderStatus(orderId, status);
    playSound('order');
  };

  return (
    <main className="bg-background text-foreground h-screen flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <ChefHat className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Pantalla de Cocina</h1>
            <p className="text-muted-foreground text-sm">
              {orders.length} pedido{orders.length !== 1 ? 's' : ''}
              {pendingCount > 0 && (
                <span className="text-red-400 font-semibold ml-2">
                  · {pendingCount} llamada{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main layout: sidebar becomes a top row below lg, where a fixed w-72
          column would eat the width the order grid needs. */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">

        {/* Orders — scrollable main area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {orders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onRemove={removeOrder}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ChefHat className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-xl font-semibold">No hay pedidos pendientes</p>
            </div>
          )}
        </div>

        {/* Waiter calls — top row below lg, fixed sidebar from lg up */}
        <div className="order-first lg:order-none w-full lg:w-72 shrink-0 flex flex-col overflow-hidden max-h-44 lg:max-h-none border-b lg:border-b-0 lg:border-l border-border pb-3 lg:pb-0 lg:pl-4">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                pendingCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`}
            />
            <Bell className="w-4 h-4" />
            <h2 className="font-bold text-base">Llamadas del Mozo</h2>
            {pendingCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            <WaiterCallsDisplay calls={calls} onResolve={resolveCall} />
          </div>
        </div>

      </div>
    </main>
  );
}
