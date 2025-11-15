// evf-core.js
// Shared EVF state + tuning

window.EVFCore = (function () {
  // main state (what the sliders edit)
  const state = {
    damping:   0.4,
    coupling:  0.7,
    noise:     0.5,
    rhythm:    0.6,
    gradient:  0.6,
    attractor: 0.7,
    coherence: 0.5
  };

  // tuning knobs you can tweak without touching the main embed
  const tuning = {
    particles: {
      densityPerPixel: 5.0,  // particle count ~ width * density
      sizeMin: 0.4,
      sizeMax: 1.3,
      innerRadiusFactor: 0.09, // attractor “no pile” radius (fraction of min(w,h))

      // motion forces
      gradStrengthBase:  0.025,
      attrStrengthBase:  0.05,
      noiseStrengthBase: 0.02,
      noiseStrengthVar:  0.06,
      driftStrengthBase: 0.02,
      driftStrengthVar:  0.06,
      destBiasBase:      0.008
    },
    field: {
      // spot for later: secondary fine-noise layer, etc.
      secondaryNoiseMix: 0.0  // start at 0; we can hook this in the shader later
    }
  };

  return { state, tuning };
})();
