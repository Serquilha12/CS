import { useState, useEffect, useRef } from 'react';

export function useScrollDirection({ threshold = 10, topOffset = 50 } = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const prevScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function updateScrollDirection() {
      const currentScrollY = window.scrollY;

      // Sempre visível no topo da página
      if (currentScrollY <= topOffset) {
        setIsVisible(true);
        prevScrollY.current = currentScrollY;
        ticking.current = false;
        return;
      }

      const diff = currentScrollY - prevScrollY.current;

      // Ignora micro-movimentos menores que o threshold
      if (Math.abs(diff) < threshold) {
        ticking.current = false;
        return;
      }

      if (diff > 0) {
        // Scroll para baixo -> esconde nav para maximizar leitura do feed
        setIsVisible(false);
      } else {
        // Scroll para cima -> ressurge imediatamente
        setIsVisible(true);
      }

      prevScrollY.current = currentScrollY;
      ticking.current = false;
    }

    function onScroll() {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, topOffset]);

  return isVisible;
}
