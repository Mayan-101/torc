import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Phase1 from './phases/Phase1';
import Phase2 from './phases/Phase2'; // Assumed to be similar refactor or kept simple
import Phase3 from './phases/Phase3'; // Assumed to be similar
import SalesGraph from './components/SalesGraph';
import Timer from './components/Timer';
import NetWorthDisplay from './components/NetWorthDisplay';
import './App.css';

const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [netWorth, setNetWorth] = useState(10000);
  const [salesData, setSalesData] = useState({ baseline: 1000, current: 0, history: [] });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await axios.post(`${API_URL}/init`);
        setSessionId(response.data.sessionId);
        setNetWorth(response.data.netWorth);
        setSalesData(response.data.salesData);
        setCurrentPhase(response.data.phase);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing:', error);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: 'register', sessionId }));
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'liveUpdate') {
        // Update both sales and net worth from the heartbeat
        setSalesData(data.salesData);
        setNetWorth(data.netWorth);
      }
    };

    return () => ws.close();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const loadQuestions = async () => {
      const response = await axios.get(`${API_URL}/questions/${currentPhase}`);
      setQuestions(response.data);
    };
    loadQuestions();
  }, [currentPhase, sessionId]);

  const handleAnswersUpdate = async (answers) => {
    // Just update backend, don't expect sales data back immediately
    const response = await axios.post(`${API_URL}/update-answers`, {
      sessionId, phase: currentPhase, answers
    });
    // Update costs immediately for feedback
    setNetWorth(response.data.netWorth); 
  };

  const handlePhaseComplete = async () => {
    const response = await axios.post(`${API_URL}/advance-phase`, { sessionId });
    setCurrentPhase(response.data.currentPhase);
  };

  if (loading || !questions) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">TORC</h1>
        </div>
        <div className="header-right">
          <NetWorthDisplay netWorth={netWorth} />
          <Timer duration={180} phase={currentPhase} onComplete={handlePhaseComplete} />
        </div>
      </header>

      <div className="app-content">
        <div className="main-section">
          <div className="phase-indicator">
             Phase {currentPhase}
          </div>
          {currentPhase === 1 && <Phase1 questions={questions} onUpdate={handleAnswersUpdate} />}
          {currentPhase === 2 && <Phase2 questions={questions} onUpdate={handleAnswersUpdate} />}
          {currentPhase === 3 && <Phase3 questions={questions} onUpdate={handleAnswersUpdate} />}
        </div>

        <aside className="sidebar">
          {/* HIDE GRAPH IN PHASE 1 */}
          {currentPhase > 1 ? (
            <SalesGraph data={salesData} />
          ) : (
            <div className="locked-graph-placeholder">
              <h3>Market Closed</h3>
              <p>Complete Phase 1 to launch product</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;