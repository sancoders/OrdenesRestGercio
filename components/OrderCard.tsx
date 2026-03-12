'use client';

import { Order } from '@/hooks/useOrders';
import { Clock, ChefHat, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: 'pending' | 'cooking' | 'ready') => void;
  onRemove: (orderId: string) => void;
}

export function OrderCard({ order, onStatusChange, onRemove }: OrderCardProps) {
  const statusConfig = {
    pending: {
      label: 'Pendiente',
      bgColor: 'bg-red-900',
      textColor: 'text-red-100',
      icon: Clock,
      nextStatus: 'cooking' as const,
      nextLabel: 'Cocinar',
    },
    cooking: {
      label: 'Cocinando',
      bgColor: 'bg-yellow-900',
      textColor: 'text-yellow-100',
      icon: ChefHat,
      nextStatus: 'ready' as const,
      nextLabel: 'Listo',
    },
    ready: {
      label: 'Listo',
      bgColor: 'bg-green-900',
      textColor: 'text-green-100',
      icon: CheckCircle2,
      nextStatus: null,
      nextLabel: null,
    },
  };

  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  const elapsedTime = Math.floor(
    (new Date().getTime() - order.createdAt.getTime()) / 1000
  );
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  return (
    <div
      className={`${config.bgColor} ${config.textColor} rounded-lg p-6 flex flex-col h-full shadow-lg border-2 border-opacity-50 transition-all`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon className="w-6 h-6" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            {config.label}
          </span>
        </div>
        <div className="text-2xl font-bold font-mono">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>

      <div className="mb-6 flex-grow">
        <div className="text-4xl font-bold mb-3">Mesa {order.table}</div>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <span className="font-semibold">{item.quantity}x</span> {item.name}
              </div>
              {item.notes && (
                <div className="text-xs opacity-80 italic">({item.notes})</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {config.nextStatus && (
          <Button
            onClick={() => onStatusChange(order.id, config.nextStatus!)}
            className="flex-1 bg-white text-black hover:bg-gray-200 font-bold"
            size="lg"
          >
            {config.nextLabel}
          </Button>
        )}
        {order.status === 'ready' && (
          <Button
            onClick={() => onRemove(order.id)}
            variant="outline"
            className="flex-1 border-white hover:bg-white hover:text-black font-bold"
            size="lg"
          >
            Entregar
          </Button>
        )}
      </div>
    </div>
  );
}
