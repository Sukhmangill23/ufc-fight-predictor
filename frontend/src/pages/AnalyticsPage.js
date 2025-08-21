import React, { useState, useEffect, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { getFighterAnalyticsDetails, searchFighters } from '../services/api';
import '../App.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const FighterAnalyticsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fighterData, setFighterData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchFighters(searchTerm).then(res => {
        setSuggestions(res.data);
        setShowSuggestions(true);
      }).catch(() => setSuggestions([]));
    } else {
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await getFighterAnalyticsDetails(searchTerm);
      setFighterData(response.data);
    } catch (err) {
      setError('Failed to fetch fighter data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (fighter) => {
    setSearchTerm(fighter);
    setShowSuggestions(false);
    // Trigger search automatically after selection
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  // Prepare data for charts
  const performanceChartData = fighterData ? {
    labels: ['Wins', 'Losses', 'KO Wins', 'Sub Wins'],
    datasets: [{
      label: 'Count',
      data: [
        fighterData.performance_metrics.wins,
        fighterData.performance_metrics.losses,
        fighterData.performance_metrics.ko_wins,
        fighterData.performance_metrics.sub_wins
      ],
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(54, 162, 235, 0.6)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(54, 162, 235, 1)'
      ],
      borderWidth: 1
    }]
  } : null;

  const winMethodChartData = fighterData ? {
    labels: ['KO/TKO', 'Submission', 'Decision'],
    datasets: [{
      data: [
        fighterData.performance_metrics.ko_wins,
        fighterData.performance_metrics.sub_wins,
        fighterData.performance_metrics.decision_wins
      ],
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(75, 192, 192, 0.6)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(75, 192, 192, 1)'
      ],
      borderWidth: 1
    }]
  } : null;

  return (
    <div className="container-fluid py-4 fighter-analytics-container">
      <div className="card h-100">
        <div className="card-header bg-dark">
          <h1 className="mb-0">FIGHTER ANALYTICS</h1>
          <p className="mb-0 text-light">Detailed performance statistics for UFC fighters</p>
        </div>

        <div className="card-body fighter-card-body">
          {/* Search Section */}
          <div className="search-container mb-4" ref={searchRef}>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Search for a fighter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length > 2 && setShowSuggestions(true)}
              />
              <button
                className="btn btn-danger"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                ) : (
                  'Analyze'
                )}
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-box mt-2 rounded">
                {suggestions.map((fighter, index) => (
                  <div
                    key={index}
                    className="p-2 suggestion-item"
                    onClick={() => handleSelectSuggestion(fighter)}
                  >
                    {fighter}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {/* Fighter Stats Section */}
          {fighterData && !loading && (
            <div className="fighter-analytics">
              <div className="row mb-4">
                <div className="col-md-12">
                  <div className="fighter-header text-center p-4">
                    <h2 className="display-4">{fighterData.basic_stats.name}</h2>
                    <div className="d-flex justify-content-center mt-3">
                      <div className="stat-badge me-3">
                        <div className="stat-value">{fighterData.basic_stats.height || 'N/A'} cm</div>
                        <div className="stat-label">Height</div>
                      </div>
                      <div className="stat-badge me-3">
                        <div className="stat-value">{fighterData.basic_stats.reach || 'N/A'} cm</div>
                        <div className="stat-label">Reach</div>
                      </div>
                      <div className="stat-badge me-3">
                        <div className="stat-value">{fighterData.basic_stats.age || 'N/A'}</div>
                        <div className="stat-label">Age</div>
                      </div>
                      <div className="stat-badge">
                        <div className="stat-value">{fighterData.basic_stats.weight_class || 'N/A'}</div>
                        <div className="stat-label">Division</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-dark text-white">
                      <h4>Career Performance</h4>
                    </div>
                    <div className="card-body d-flex flex-column">
                      <div className="row text-center mb-3">
                        <div className="col-md-4">
                          <div className="metric-value metric-total">
                            {fighterData.performance_metrics.total_fights}
                          </div>
                          <div className="text-white">Total Fights</div>
                        </div>
                        <div className="col-md-4">
                          <div className="metric-value metric-wins">
                            {fighterData.performance_metrics.wins}
                          </div>
                          <div className="text-white">Wins</div>
                        </div>
                        <div className="col-md-4">
                          <div className="metric-value metric-losses">
                            {fighterData.performance_metrics.losses}
                          </div>
                          <div className="text-white">Losses</div>
                        </div>
                      </div>
                      {performanceChartData && (
                        <div className="flex-grow-1" style={{ minHeight: '300px' }}>
                          <Bar
                            data={performanceChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-dark text-white">
                      <h4>Win Methods</h4>
                    </div>
                    <div className="card-body d-flex flex-column">
                      <div className="row text-center mb-3">
                        <div className="col-md-4">
                          <div className="metric-value metric-ko">
                            {fighterData.performance_metrics.ko_wins}
                          </div>
                          <div className="text-white">KO/TKO</div>
                        </div>
                        <div className="col-md-4">
                          <div className="metric-value metric-sub">
                            {fighterData.performance_metrics.sub_wins}
                          </div>
                          <div className="text-white">Submissions</div>
                        </div>
                        <div className="col-md-4">
                          <div className="metric-value metric-dec">
                            {fighterData.performance_metrics.decision_wins}
                          </div>
                          <div className="text-white">Decisions</div>
                        </div>
                      </div>
                      {winMethodChartData && (
                        <div className="flex-grow-1" style={{ minHeight: '300px' }}>
                          <Pie
                            data={winMethodChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom'
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fight History */}
              <div className="row">
                <div className="col-md-12">
                  <div className="card">
                    <div className="card-header bg-dark">
                      <h4 className="text-white">Recent Fight History</h4>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-dark table-striped fight-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Opponent</th>
                              <th>Result</th>
                              <th>Method</th>
                              <th>Weight Class</th>
                              <th>Rounds</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fighterData.fight_history.map((fight, index) => (
                              <tr key={index}>
                                <td>{fight.date}</td>
                                <td>{fight.opponent}</td>
                                <td>
                                  <span className={`badge ${
                                    fight.result === 'Win' ? 'bg-success' : 
                                    fight.result === 'Loss' ? 'bg-danger' : 'bg-warning'
                                  }`}>
                                    {fight.result}
                                  </span>
                                </td>
                                <td>{fight.method}</td>
                                <td>{fight.weight_class}</td>
                                <td>{fight.rounds}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!fighterData && !loading && (
            <div className="text-center py-5 empty-state">
              <i className="fas fa-user-ninja fa-5x mb-4"></i>
              <h3>Search for a Fighter</h3>
              <p>
                Enter a fighter's name to view detailed performance analytics and fight history
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FighterAnalyticsPage;
