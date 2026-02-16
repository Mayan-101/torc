// TORC Configuration File
// Modify these values to customize the simulation without editing core code

module.exports = {
  // Timer settings (in seconds)
  PHASE_DURATION: 180, // 3 minutes per phase (change to 1800 for 30 minutes)
  
  // Starting conditions
  INITIAL_NET_WORTH: 10000, // USD
  INITIAL_SALES_BASELINE: 1000, // USD
  
  // Phase 1: Starting Up - Optimal Answers
  phase1: {
    q1: {
      numPeople: 30,
      confidence: 95,
      costPerPerson: 100,
      errorMargin: 0.01 // 1% margin of error
    },
    q2: {
      // Calculated from: 500mg / 36mg/mm³ for adults, 250mg / 36mg/mm³ for children
      // Throat diameter: Adults 25-27mm, Children 8-11mm
      // Comfortable radius: 40% of throat radius
      adult: {
        diameter: 10.4,  // mm
        height: 0.164,   // mm (very thin - consider if this should be adjusted)
        errorMargin: 0.01 // 1%
      },
      children: {
        diameter: 3.8,   // mm
        height: 0.612,   // mm
        errorMargin: 0.01 // 1%
      }
    }
  },
  
  // Phase 2: Production - Optimal Answers
  phase2: {
    equity: 20,         // percentage
    valuation: 500000,  // USD
    errorMargin: 0.01   // 1%
  },
  
  // Phase 3: IPO & Risk Management - Optimal Answers
  phase3: {
    equity: 15,         // percentage
    valuation: 1000000, // USD
    errorMargin: 0.01   // 1%
  },
  
  // Sales calculation settings
  sales: {
    impactFormula: 'linear', // 'linear' or 'exponential'
    // Linear: sales = baseline * (1 - error)
    // Exponential: sales = baseline * exp(-error)
  },
  
  // WebSocket settings
  websocket: {
    port: 3001,
    updateInterval: 500 // milliseconds between updates
  }
};