'use client';

import { WaiterCall } from '@/hooks/useWaiterCalls';
import { Bell, MessageSquare, DollarSign, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WaiterCallsDisplayProps {
  calls: WaiterCall[];
  onAcknowledge: (callId: string) => void;
  onRemove: (callId: string) => void;
}

export function WaiterCallsDisplay({
  calls,
  onAcknowledge,
  onRemove,
}: WaiterCallsDisplayProps) {
  const reasonConfig = {
    service: {
      icon: MessageSquare,
      label: 'Servicio',
      color: 'from-blue-600 to-blue-800',
    },
    payment: {
      icon: DollarSign,
      label: 'Pago',
      color: 'from-purple-600 to-purple-800',
    },
    complaint: {
      icon: AlertCircle,
      label: 'Reclamo',
      color: 'from-red-600 to-red-800',
    },
    other: {
      icon: Bell,
      label: 'Otro',
      color: 'from-gray-600 to-gray-800',
    },
  };

  if (calls.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No hay llamadas de mozo</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {calls.map((call) => {
        const config = reasonConfig[call.reason];
        const Icon = config.icon;

        return (
          <div
            key={call.id}
            className={`bg-gradient-to-br ${config.color} rounded-lg p-4 text-white border-2 ${
              call.acknowledged ? 'border-green-500 opacity-75' : 'border-yellow-400'
            } shadow-lg transition-all`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                <span className="font-bold text-lg">{config.label}</span>
              </div>
              {call.acknowledged && (
                <div className="text-xs bg-green-500 px-2 py-1 rounded-full font-bold">
                  Atendido
                </div>
              )}
            </div>

            <div className="text-3xl font-bold mb-3">Mesa {call.table}</div>

            {call.message && (
              <p className="text-sm mb-3 opacity-90">{call.message}</p>
            )}

            <div className="text-xs opacity-75 mb-4">
              {Math.floor((new Date().getTime() - call.createdAt.getTime()) / 1000)}s
              ago
            </div>

            <div className="flex gap-2">
              {!call.acknowledged && (
                <Button
                  onClick={() => onAcknowledge(call.id)}
                  className="flex-1 bg-white text-black hover:bg-gray-200 font-bold"
                  size="sm"
                >
                  Confirmar
                </Button>
              )}
              <Button
                onClick={() => onRemove(call.id)}
                variant="outline"
                className="flex-1 border-white text-white hover:bg-white hover:text-black font-bold"
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Resolver
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
