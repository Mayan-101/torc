import React, { useEffect, useState } from 'react';

function NetWorthDisplay({ netWorth }) {
  const [prevNetWorth, setPrevNetWorth] = useState(netWorth);
  const [isDecreasing, setIsDecreasing] = useState(false);

  useEffect(() => {
    if (netWorth < prevNetWorth) {
      setIsDecreasing(true);
      setTimeout(() => setIsDecreasing(false), 1000);
    }
    setPrevNetWorth(netWorth);
  }, [netWorth, prevNetWorth]);

  return (
    <div className="net-worth-display">
      <span className="net-worth-label">Net Worth</span>
      <span className={`net-worth-value ${isDecreasing ? 'decreasing' : ''}`}>
        ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

export default NetWorthDisplay;