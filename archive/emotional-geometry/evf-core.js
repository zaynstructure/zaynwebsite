// evf-core.js
// central place to keep EVF defaults + tunable visual settings

window.EVFCore = (function () {
  // --- EVF parameter state (0–1 each) ---
  const state = {
    damping:   0.4,
    coupling:  0.7,
    noise:     0.5,
    rhythm:    0.6,
    gradient:  0.6,
    attractor: 0.7,
    coherence: 0.5
  };

  // --- visual tuning (non-parameter stuff) ---
  const tuning = {
    // particle system settings
    particles: {
      // how many particles per pixel of width
      densityPerPixel: 5.0,  // matches: Math.floor(w * 5.0)

      // size range in pixels (before breathing modulation)
      sizeMin: 0.4,
      sizeMax: 1.3
    }

    // later we can add things like:
    // field: { fineNoise: { enabled: true, scale: 10.0, gain: 0.15 } }
  };

  return { state, tuning };
})();
