import confetti from 'canvas-confetti';

/**
 * Fires a celebratory confetti explosion.
 */
export function fireCelebration() {
  // Burst from bottom center
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10B981', '#06B6D4', '#3B82F6', '#F59E0B', '#FFFFFF']
  });

  // Fireworks-style side cannons
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#10B981', '#34D399', '#6EE7B7']
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#06B6D4', '#38BDF8', '#7DD3FC']
    });
  }, 200);
}

/**
 * Fires a subtle success particle burst.
 */
export function fireQuickSuccess() {
  confetti({
    particleCount: 35,
    spread: 45,
    origin: { y: 0.7 },
    colors: ['#10B981', '#34D399']
  });
}
