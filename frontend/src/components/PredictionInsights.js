import React from 'react';
import '../App.css'

const PredictionInsights = ({ insights, redFighter, blueFighter }) => {
  if (!insights) return null;

  return (
    <div className="insights-card  p-3 mb-3 bg-dark rounded">
     <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0)" }}>
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
  {/* Red Fighter's share */}
  <div
    className="progress-bar bg-danger"
    role="progressbar"
    style={{
      width: `${(insight.red_value / (insight.red_value + insight.blue_value)) * 100}%`,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0
    }}
  ></div>

  {/* Blue Fighter's share */}
  <div
    className="progress-bar bg-primary"
    role="progressbar"
    style={{
      width: `${(insight.blue_value / (insight.red_value + insight.blue_value)) * 100}%`,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0
    }}
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
