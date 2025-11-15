// evf-core.js
// Central place for EVF state + visual tuning knobs

window.EVFCore = {
  // --- LIVE EVF PARAMETERS (what the sliders animate) ---
  state: {
    damping:   0.4,
    coupling:  0.7,
    noise:     0.5,
    rhythm:    0.6,
    gradient:  0.6,
    attractor: 0.7,
    coherence: 0.5
  },

  // --- VISUAL TUNING (you hand-tweak these) ---
  tuning: {
    // How strong the *directional slope* feels visually / in particles
    gradient: {
      // overall scaling of gradient in visuals (field + particles)
      globalBoost: 1.0,      // raise if you want more directional drift
      // extra boost when gradient slider is near 1
      highEndBoost: 0.6      // 0 → linear, 1 → more non-linear kick near 1.0
    },

    // Particle behaviour + look
    particles: {
      // density: how many per px of width
      densityPerPixel: 5.0,   // lower = fewer particles

      // size range in px (before breathing)
      sizeMin: 0.4,
      sizeMax: 1.3,

      // “no pile” inner radius around attractor, as fraction of min(w,h)
      innerRadiusFactor: 0.09,

      // attractor pull strength baseline
      attractorStrength: 0.05,

      // base cluster pull and range with coupling
      clusterPullBase: 0.05,
      clusterPullRange: 0.18,

      // how much global drift when drive is low
      driftBase: 0.02,
      driftRange: 0.06,

      // how much random jitter from noise param
      noiseBase: 0.02,
      noiseRange: 0.06,

      // brightness range (for inverted-light dots)
      greyMin: 180,
      greyMax: 240,

      // how much to tint slightly blue near attractor
      blueBiasMax: 20
    },

    // Extra fine noise layer in shader (ξ₂)
    fineNoise: {
      enabled: true,

      // base spatial scale (bigger = finer detail)
      baseScale: 14.0,

      // base amplitude added into the field
      baseAmp: 0.12,

      // which EVF param modulates this layer: "noise" | "coherence" | "gradient"
      linkTo: "noise",

      // how strongly the chosen param modulates amplitude
      linkStrength: 0.7   // e.g. 0.7 → high noise/coherence noticeably boosts fine detail
    }
  }
};
