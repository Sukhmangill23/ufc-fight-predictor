import React from 'react';

const PredictionInsights = ({ insights, redFighter, blueFighter }) => {
  if (!insights) return null;

  return (
    <div className="insights-card mt-4">
     <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
  <div
    style={{
      height: "4px",
      width: "100%",
      background: "linear-gradient(90deg, var(--ufc-red), var(--ufc-blue))",
      borderRadius: "4px",
      marginBottom: "12px",
    }}
  ></div>
  <h4 style={{ marginBottom: "1rem" }}>
  <span style={{ color: "white" }}>Prediction Insights</span>
</h4>

</div>

      <p>Key factors influencing the prediction:</p>

      <div className="insights-list">
        {insights.map((insight, index) => (
          <div key={index} className="insight-item p-3 mb-3 bg-dark rounded">
            <div className="d-flex justify-content-between mb-2">
              <strong className="text-uppercase">{insight.attribute}</strong>
              <span className={`badge ${insight.difference > 0 ? 'bg-danger' : 'bg-primary'}`}>
                {insight.difference > 0
                  ? `Advantage ${redFighter}`
                  : `Advantage ${blueFighter}`}
              </span>
            </div>

            <div className="d-flex justify-content-between mb-2">
              <span>{redFighter}: {insight.red_value.toFixed(2)}</span>
              <span>{blueFighter}: {insight.blue_value.toFixed(2)}</span>
            </div>

            <div className="progress mb-2" style={{ height: '8px' }}>
              <div
                className={`progress-bar ${insight.difference > 0 ? 'bg-danger' : 'bg-primary'}`}
                style={{ width: `$,{Math.min(100, Math.abs(insight.difference) * 10}%` }}
              ></div>
            </div>

            <div className="d-flex justify-content-between">
              <small>Influence:</small>
              <small>{Math.abs(insight.difference).toFixed(2)}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionInsights;
