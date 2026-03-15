'use client';

import { WaiterCall, WaiterCallReason } from '@/hooks/useWaiterCalls';
import { Bell, Droplets, Wheat, HelpCircle, Sparkles, Receipt, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WaiterCallsDisplayProps {
  calls: WaiterCall[];
  onResolve: (callId: string) => void;
}

const reasonConfig: Record<WaiterCallReason, { icon: any; label: string; color: string }> = {
  water:    { icon: Droplets,   label: '💧 Pedir agua',       color: 'border-blue-500 bg-blue-950' },
  bread:    { icon: Wheat,      label: '🍞 Pedir pan',        color: 'border-yellow-500 bg-yellow-950' },
  question: { icon: HelpCircle, label: '❓ Consulta',         color: 'border-cyan-500 bg-cyan-950' },
  clean:    { icon: Sparkles,   label: '🧹 Limpiar mesa',     color: 'border-green-500 bg-green-950' },
  bill:     { icon: Receipt,    label: '💸 Pedir la cuenta',  color: 'border-purple-500 bg-purple-950' },
  other:    { icon: Bell,       label: '📌 Otro motivo',      color: 'border-gray-500 bg-gray-800' },
};

function timeAgo(createdAt: string): string {
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (secs < 60) return `hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins}m`;
  return `hace ${Math.floor(mins / 60)}h`;
}

export function WaiterCallsDisplay({ calls, onResolve }: WaiterCallsDisplayProps) {
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Bell className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm">Sin llamadas pendientes</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {calls.map((call) => {
        const config = reasonConfig[call.reason];
        const Icon = config.icon;

        return (
          <div
            key={call.id}
            className={`rounded-lg border-2 ${config.color} p-4 text-white shadow-md`}
          >
            {/* Header: reason + status badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-semibold text-sm">{config.label}</span>
              </div>
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold uppercase">
                {call.status}
              </span>
            </div>

            {/* Table */}
            <div className="text-2xl font-bold mb-1">{call.table}</div>

            {/* Message */}
            {call.message && (
              <p className="text-sm opacity-80 mb-2">{call.message}</p>
            )}

            {/* Time */}
            <p className="text-xs opacity-60 mb-3">{timeAgo(call.createdAt)}</p>

            {/* Resolve button */}
            <Button
              onClick={() => onResolve(call.id)}
              size="sm"
              className="w-full bg-white text-black hover:bg-gray-200 font-bold"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Resolver
            </Button>
          </div>
        );
      })}
    </div>
  );
}
