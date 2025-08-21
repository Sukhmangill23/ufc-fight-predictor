import React, { useState, useEffect } from 'react';
import { getPredictionHistory } from '../services/api';

const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await getPredictionHistory();
        setMetrics(response.data);
      } catch (error) {
        console.error('Error fetching prediction history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (!metrics) return <div>Error loading analytics data</div>;

  return (
    <div className="analytics-dashboard">
      <h3>Model Performance Analytics</h3>

      <div className="metrics-summary">
        <div className="metric-card">
          <h4>Overall Accuracy</h4>
          <p className="metric-value">{(metrics.accuracy * 100).toFixed(1)}%</p>
        </div>

        <div className="metric-card">
          <h4>Total Predictions</h4>
          <p className="metric-value">{metrics.recent_predictions.length}</p>
        </div>
      </div>

      <div className="recent-predictions mt-4">
        <h4>Recent Predictions</h4>
        <table className="table table-dark table-striped">
          <thead>
            <tr>
              <th>Red Fighter</th>
              <th>Blue Fighter</th>
              <th>Predicted</th>
              <th>Actual</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {metrics.recent_predictions.map((pred, idx) => (
              <tr key={idx}>
                <td>{pred.red_fighter}</td>
                <td>{pred.blue_fighter}</td>
                <td>{pred.predicted_winner}</td>
                <td>{pred.actual_winner || 'N/A'}</td>
                <td className={pred.correct ? 'text-success' : 'text-danger'}>
                  {pred.correct ? '✓ Correct' : '✗ Incorrect'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
