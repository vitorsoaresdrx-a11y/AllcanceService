export function playCelebrationSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523, 659, 784, 1047]; // Dó Mi Sol Dó
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch {
    // AudioContext may not be available
  }
}

export function triggerConfetti() {
  import("canvas-confetti").then(({ default: confetti }) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#A1A1AA", "#A1A1AA", "#ffffff"],
    });
  });
}
