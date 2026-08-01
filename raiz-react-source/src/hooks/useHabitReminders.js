import { useEffect, useRef } from 'react';
import { todayKey, todayHabits } from '../lib/helpers';

export function useHabitReminders(habits) {
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (localStorage.getItem('raiz_notif_enabled') !== '1') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    function check() {
      const today = todayKey();
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      todayHabits(habits).forEach(h => {
        if (h.last_done === today) return;
        if (!h.time) return;
        const key = h.id + '_' + today;
        if (notifiedRef.current.has(key)) return;
        if (h.time === hhmm) {
          new Notification('Raiz 🌱', { body: `Hora de: ${h.name}`, icon: 'icon.svg' });
          notifiedRef.current.add(key);
        }
      });
    }
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [habits]);
}
