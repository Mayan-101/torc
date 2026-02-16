//
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

// --- DO NOT CHANGE QUESTIONS OR OPTIMAL ANSWERS ---
const OPTIMAL_ANSWERS = {
  phase1: {
    q1: { numPeople: 30, confidence: 95, costPerPerson: 100 },
    q2: { adult: { diameter: 10.4, height: 0.164 }, children: { diameter: 3.8, height: 0.612 } }
  },
  phase2: { equity: 20, valuation: 500000 },
  phase3: { equity: 15, valuation: 1000000 }
};

function calculateError(actual, expected, margin = 0.01) {
  if (!actual && actual !== 0) return 1.0;
  const errorPercent = Math.abs(actual - expected) / expected;
  return Math.max(0, errorPercent - margin);
}

// --- MARKET LOOP ---
const activeSessions = new Map();

function startSessionLoop(sessionId) {
  if (activeSessions.has(sessionId)) return;

  const intervalId = setInterval(() => {
    db.get('SELECT * FROM participants WHERE session_id = ?', [sessionId], (err, row) => {
      if (err || !row) return;

      // STRICT GATE: Market loop waits for launch flag
      if (!row.market_active) return;

      let salesData = JSON.parse(row.sales_data);
      let currentVal = salesData.current;
      let performance = row.current_performance;

      // Logic: Flatline (Bad) vs Active (Good)
      let volatility, drift;
      if (performance < 0.5) {
        volatility = 0.0005; 
        drift = 0;           
      } else {
        volatility = 0.03;   
        drift = 0.005;       
      }

      const noise = (Math.random() * 2 - 1) * volatility;
      let newValue = currentVal * (1 + drift + noise);
      newValue = Math.max(10, newValue);

      const profitTick = performance > 0.5 ? (newValue * 0.02) : 0; 
      let newNetWorth = row.net_worth + profitTick;

      salesData.current = newValue;
      salesData.history.push({
        time: Date.now() - new Date(row.created_at).getTime(),
        value: newValue
      });
      
      if (salesData.history.length > 50) salesData.history.shift();

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
  }, 1000);

  activeSessions.set(sessionId, intervalId);
}

const clients = new Map();
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'register') {
      clients.set(data.sessionId, ws);
      startSessionLoop(data.sessionId);
    }
  });
});

function broadcastUpdate(sessionId, data) {
  const client = clients.get(sessionId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

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
  // CRITICAL: Extract 'launch' flag
  const { sessionId, phase, answers, launch } = req.body;
  
  db.get('SELECT * FROM participants WHERE session_id = ?', [sessionId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Session not found' });

    let netWorth = row.net_worth;
    let totalError = 0;
    let costs = 0;

    // --- Error Calculation ---
    if (phase === 1) {
      if (answers.numPeople) {
        costs += answers.numPeople * OPTIMAL_ANSWERS.phase1.q1.costPerPerson;
        const peopleErr = calculateError(answers.numPeople, OPTIMAL_ANSWERS.phase1.q1.numPeople);
        const confErr = calculateError(answers.confidence, OPTIMAL_ANSWERS.phase1.q1.confidence);
        totalError += (peopleErr + confErr) / 2;
      }
      if (answers.adultDiameter) {
        const adErr = calculateError(answers.adultDiameter, OPTIMAL_ANSWERS.phase1.q2.adult.diameter);
        const ahErr = calculateError(answers.adultHeight, OPTIMAL_ANSWERS.phase1.q2.adult.height);
        totalError = (totalError + adErr + ahErr) / 3;
      }
    } else if (phase === 2) {
      const eqErr = calculateError(answers.equity, OPTIMAL_ANSWERS.phase2.equity);
      const valErr = calculateError(answers.valuation, OPTIMAL_ANSWERS.phase2.valuation);
      totalError = (eqErr + valErr) / 2;
    } else if (phase === 3) {
      const eqErr = calculateError(answers.equity, OPTIMAL_ANSWERS.phase3.equity);
      const valErr = calculateError(answers.valuation, OPTIMAL_ANSWERS.phase3.valuation);
      totalError = (eqErr + valErr) / 2;
    }

    const performance = Math.max(0.1, 1 - totalError);

    // --- CRITICAL LOGIC CHANGE ---
    // Only deduct costs and start market if 'launch' is true
    let marketActive = row.market_active;
    
    if (launch) {
      netWorth -= costs; // Apply one-time cost
      marketActive = 1;  // Start the graph loop
    }

    const phaseField = `phase${phase}_data`;
    db.run(
      `UPDATE participants SET ${phaseField} = ?, net_worth = ?, current_performance = ?, market_active = ? WHERE session_id = ?`,
      [JSON.stringify(answers), netWorth, performance, marketActive, sessionId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ netWorth, costs });
      }
    );
  });
});

app.post('/api/advance-phase', (req, res) => {
  const { sessionId } = req.body;
  db.run('UPDATE participants SET current_phase = current_phase + 1 WHERE session_id = ?', [sessionId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT current_phase FROM participants WHERE session_id = ?', [sessionId], (err, row) => {
      res.json({ currentPhase: row.current_phase });
    });
  });
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
      videoUrl: 'https://www.youtube.com/embed/3JZ_D3ELwOQ',
      questions: [{ id: 'q1', title: 'Investor Pitch - Series A', description: 'Pitch to investors.', inputs: [{ name: 'equity', label: 'Equity Offered', type: 'number', unit: '%' }, { name: 'valuation', label: 'Company Valuation', type: 'number', unit: 'USD' }] }]
    },
    3: {
      videoUrl: 'https://www.youtube.com/embed/lTRiuFIWV54',
      questions: [{ id: 'q1', title: 'IPO', description: 'Go public.', inputs: [{ name: 'equity', label: 'Public Equity', type: 'number', unit: '%' }, { name: 'valuation', label: 'IPO Valuation', type: 'number', unit: 'USD' }] }]
    }
  };
  res.json(questions[phase] || { error: 'Invalid phase' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));