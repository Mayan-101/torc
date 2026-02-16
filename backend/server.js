const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE,
    current_phase INTEGER DEFAULT 1,
    net_worth REAL DEFAULT 10000,
    current_performance REAL DEFAULT 0.0,
    market_active INTEGER DEFAULT 0,
    phase1_data TEXT,
    phase2_data TEXT,
    phase3_data TEXT,
    sales_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Optimal Answers Configuration
const OPTIMAL_ANSWERS = {
  phase1: {
    q1: {
      numPeople: 30,
      confidence: 95,
      costPerPerson: 100
    },
    q2: {
      adult: { diameter: 10.4, height: 0.164 },
      children: { diameter: 3.8, height: 0.612 }
    }
  },
  phase2: {
    equity: 20,
    valuation: 500000
  },
  phase3: {
    equity: 15,
    valuation: 1000000
  }
};

// Calculate error percentage
function calculateError(actual, expected, margin = 0.01) {
  if (!actual && actual !== 0) return 1.0; // Max error if missing
  const errorPercent = Math.abs(actual - expected) / expected;
  return Math.max(0, errorPercent - margin);
}

// --- REALISTIC MARKET SIMULATION LOOP ---
const activeSessions = new Map();

function startSessionLoop(sessionId) {
  if (activeSessions.has(sessionId)) return;

  const intervalId = setInterval(() => {
    db.get('SELECT * FROM participants WHERE session_id = ?', [sessionId], (err, row) => {
      if (err || !row) return;

      // 1. Only run if Market is Active (triggered by first submit)
      if (!row.market_active) return;

      let salesData = JSON.parse(row.sales_data);
      let currentVal = salesData.current;
      let performance = row.current_performance; // 0.0 (bad) to 1.0 (perfect)

      // 2. Realistic Market Dynamics (Random Walk)
      // "Stock Price" = Previous Price * (1 + Drift + Noise)
      
      let volatility;
      let drift;

      // LOGIC UPDATE: Flatline vs Active Market
      if (performance < 0.5) {
        // BAD PARAMS: Flatline (Minimal noise, zero growth)
        volatility = 0.0005; // Extremely low noise
        drift = 0;           // No movement (stagnant)
      } else {
        // GOOD PARAMS: Active Market (Healthy noise, positive growth)
        volatility = 0.03;   // Standard market volatility
        drift = 0.005;       // Positive growth trend
      }

      // Calculate Random Noise (-1 to 1 * volatility)
      const noise = (Math.random() * 2 - 1) * volatility;
      
      // Calculate New Stock/Sales Value
      let newValue = currentVal * (1 + drift + noise);
      newValue = Math.max(10, newValue); // Floor at $10

      // 3. Net Worth Logic (Linear Profit Accumulation)
      // Only generate profit ticks if performance is good
      const profitTick = performance > 0.5 ? (newValue * 0.02) : 0; 
      let newNetWorth = row.net_worth + profitTick;

      // 4. Update History
      salesData.current = newValue;
      salesData.history.push({
        time: Date.now() - new Date(row.created_at).getTime(),
        value: newValue
      });
      
      // Keep last 50 points for graph performance
      if (salesData.history.length > 50) salesData.history.shift();

      // 5. Save & Broadcast
      db.run(
        'UPDATE participants SET net_worth = ?, sales_data = ? WHERE session_id = ?',
        [newNetWorth, JSON.stringify(salesData), sessionId],
        (err) => {
          if (!err) {
            broadcastUpdate(sessionId, {
              type: 'liveUpdate',
              netWorth: newNetWorth,
              salesData: salesData
            });
          }
        }
      );
    });
  }, 1000); // Tick every 1 second

  activeSessions.set(sessionId, intervalId);
}

// WebSocket Setup
const clients = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'register') {
      clients.set(data.sessionId, ws);
      startSessionLoop(data.sessionId); // Ensure loop exists on reconnect
    }
  });
  
  ws.on('close', () => {
    // Optional: clear interval if you want to stop sim on disconnect
  });
});

function broadcastUpdate(sessionId, data) {
  const client = clients.get(sessionId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

// API Endpoints
app.post('/api/init', (req, res) => {
  const sessionId = Math.random().toString(36).substr(2, 9);
  const initialSales = { baseline: 1000, current: 1000, history: [{ time: 0, value: 1000 }] };
  
  db.run(
    'INSERT INTO participants (session_id, sales_data) VALUES (?, ?)',
    [sessionId, JSON.stringify(initialSales)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      startSessionLoop(sessionId);
      res.json({ sessionId, netWorth: 10000, phase: 1, salesData: initialSales });
    }
  );
});

app.get('/api/participant/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  db.get('SELECT * FROM participants WHERE session_id = ?', [sessionId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Session not found' });
    res.json({
      sessionId: row.session_id,
      currentPhase: row.current_phase,
      netWorth: row.net_worth,
      salesData: JSON.parse(row.sales_data)
    });
  });
});

app.post('/api/update-answers', (req, res) => {
  const { sessionId, phase, answers } = req.body;
  
  db.get('SELECT * FROM participants WHERE session_id = ?', [sessionId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Session not found' });

    let netWorth = row.net_worth;
    let totalError = 0;
    let costs = 0;

    // Calculate Performance & Costs
    if (phase === 1) {
      // Q1 Costs & Error
      if (answers.numPeople) {
        costs += answers.numPeople * OPTIMAL_ANSWERS.phase1.q1.costPerPerson;
        const peopleErr = calculateError(answers.numPeople, OPTIMAL_ANSWERS.phase1.q1.numPeople);
        const confErr = calculateError(answers.confidence, OPTIMAL_ANSWERS.phase1.q1.confidence);
        totalError += (peopleErr + confErr) / 2; // Weight Q1 50%
      }
      
      // Q2 Error (if submitted)
      if (answers.adultDiameter) {
        const adErr = calculateError(answers.adultDiameter, OPTIMAL_ANSWERS.phase1.q2.adult.diameter);
        const ahErr = calculateError(answers.adultHeight, OPTIMAL_ANSWERS.phase1.q2.adult.height);
        totalError = (totalError + adErr + ahErr) / 3; // Average out
      }
    } 
    else if (phase === 2) {
      const eqErr = calculateError(answers.equity, OPTIMAL_ANSWERS.phase2.equity);
      const valErr = calculateError(answers.valuation, OPTIMAL_ANSWERS.phase2.valuation);
      totalError = (eqErr + valErr) / 2;
    } 
    else if (phase === 3) {
      const eqErr = calculateError(answers.equity, OPTIMAL_ANSWERS.phase3.equity);
      const valErr = calculateError(answers.valuation, OPTIMAL_ANSWERS.phase3.valuation);
      totalError = (eqErr + valErr) / 2;
    }

    // Performance Score (0.0 to 1.0)
    // 1.0 = Perfect match, 0.0 = High error
    const performance = Math.max(0.1, 1 - totalError);

    // Apply One-Time Cost Deduction
    netWorth -= costs;

    // Activate Market
    const marketActive = 1;

    // Update DB
    const phaseField = `phase${phase}_data`;
    db.run(
      `UPDATE participants SET ${phaseField} = ?, net_worth = ?, current_performance = ?, market_active = ? WHERE session_id = ?`,
      [JSON.stringify(answers), netWorth, performance, marketActive, sessionId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Return updated net worth immediately (cost deduction)
        // Market updates will follow via WebSocket
        res.json({ netWorth, costs });
      }
    );
  });
});

app.post('/api/advance-phase', (req, res) => {
  const { sessionId } = req.body;
  db.run(
    'UPDATE participants SET current_phase = current_phase + 1 WHERE session_id = ?',
    [sessionId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT current_phase FROM participants WHERE session_id = ?', [sessionId], (err, row) => {
        res.json({ currentPhase: row.current_phase });
      });
    }
  );
});

app.get('/api/questions/:phase', (req, res) => {
  const { phase } = req.params;
  
  const questions = {
    1: {
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      questions: [
        {
          id: 'q1',
          title: 'Placebo Testing',
          description: 'Suppose you are a Biochemical engineer and you discovered a new formula which is a cure for cancer. You have to do a placebo test for that now. You got to select how many people to be tested on?',
          inputs: [
            { name: 'numPeople', label: 'Number of People', type: 'number', unit: 'people' },
            { name: 'confidence', label: 'Confidence Level', type: 'number', unit: '%' },
            { name: 'hypothesisTest', label: 'Hypothesis Test Result', type: 'boolean', options: ['Pass', 'Fail'] }
          ]
        },
        {
          id: 'q2',
          title: 'Tablet Dimensions',
          description: 'Design dimensions of the capsule/tablet such that it is easy for adults and children to swallow. Adults can have 500mg and children can have 250mg. The density of the chemical is 36mg/mm³. Humans are comfortable to swallow tablets of radius 40% of their throat diameter. Diameter of adult throat is 25-27mm and children for age 10 is 8-11mm.',
          inputs: [
            { name: 'adultDiameter', label: 'Adult Tablet Diameter', type: 'number', unit: 'mm' },
            { name: 'adultHeight', label: 'Adult Tablet Height', type: 'number', unit: 'mm' },
            { name: 'childDiameter', label: 'Child Tablet Diameter', type: 'number', unit: 'mm' },
            { name: 'childHeight', label: 'Child Tablet Height', type: 'number', unit: 'mm' }
          ]
        }
      ]
    },
    2: {
      videoUrl: 'https://www.youtube.com/embed/3JZ_D3ELwOQ', // Added for Phase 2
      questions: [
        {
          id: 'q1',
          title: 'Investor Pitch - Series A',
          description: 'You are supposed to pitch your product to an investor. You will have to sell some equity to them.',
          inputs: [
            { name: 'equity', label: 'Equity Offered', type: 'number', unit: '%' },
            { name: 'valuation', label: 'Company Valuation', type: 'number', unit: 'USD' }
          ]
        }
      ]
    },
    3: {
      videoUrl: 'https://www.youtube.com/embed/lTRiuFIWV54', // Added for Phase 3
      questions: [
        {
          id: 'q1',
          title: 'IPO & Risk Management',
          description: 'Your company is going public. Set your IPO parameters.',
          inputs: [
            { name: 'equity', label: 'Public Equity', type: 'number', unit: '%' },
            { name: 'valuation', label: 'IPO Valuation', type: 'number', unit: 'USD' }
          ]
        }
      ]
    }
  };

  res.json(questions[phase] || { error: 'Invalid phase' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});