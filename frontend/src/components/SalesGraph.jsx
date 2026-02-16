import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './SalesGraph.css';

function SalesGraph({ data }) {
  const formatData = () => {
    return data.history.map((point, index) => ({
      time: Math.floor(point.time / 1000),
      sales: point.value
    }));
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{`${payload[0].payload.time}s`}</p>
          <p className="tooltip-sales">{`$${payload[0].value.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sales-graph-container">
      <div className="graph-header">
        <h3 className="graph-title">Real-Time Sales</h3>
        <div className="graph-stats">
          <div className="stat">
            <span className="stat-label">Current</span>
            <span className="stat-value current">${data.current.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Baseline</span>
            <span className="stat-value baseline">${data.baseline.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Performance</span>
            <span className={`stat-value ${data.current >= data.baseline ? 'positive' : 'negative'}`}>
              {((data.current / data.baseline - 1) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatData()} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3148" />
          <XAxis 
            dataKey="time" 
            stroke="#8b92a8"
            style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }}
            label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#8b92a8' }}
          />
          <YAxis 
            stroke="#8b92a8"
            style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }}
            label={{ value: 'Sales ($)', angle: -90, position: 'insideLeft', fill: '#8b92a8' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="#00ff88" 
            strokeWidth={2}
            dot={false}
            fill="url(#salesGradient)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SalesGraph;