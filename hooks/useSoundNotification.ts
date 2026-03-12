'use client';

import { useEffect, useRef } from 'react';

export function useSoundNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Store in ref for use in playSound
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
  }, []);

  const playSound = (type: 'order' | 'call' = 'order') => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    if (type === 'order') {
      // Double beep for new order
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else {
      // Single beep for waiter call
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  return { playSound };
}
