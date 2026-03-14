'use client';

import { useCallback } from 'react';

export function useSoundNotification() {
  const playSound = useCallback((type: 'order' | 'call' = 'order') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (type === 'order') {
        // Double beep for new order - create two separate oscillators
        // First beep
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.setValueAtTime(800, audioContext.currentTime);
        gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc1.start(audioContext.currentTime);
        osc1.stop(audioContext.currentTime + 0.2);

        // Second beep
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime + 0.3);
        osc2.stop(audioContext.currentTime + 0.5);
      } else {
        // Single beep for waiter call
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
    } catch (err) {
      console.error('[v0] Error playing sound:', err);
    }
  }, []);

  return { playSound };
}
