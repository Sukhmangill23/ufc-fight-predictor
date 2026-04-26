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
import { getFighterAnalyticsDetails, searchFighters} from '../services/api';
import '../App.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ── Upcoming Events Section ──────────────────────────────────────────────────

const UpcomingEvents = ({ onPredictFight }) => {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});


  const toggleEvent = (name) =>
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  if (loading) return (
    <div className="text-center py-4">
      <span className="spinner-border text-danger" role="status"></span>
      <p className="mt-2 text-muted">Loading live UFC events...</p>
    </div>
  );

  if (!events.length) return (
    <div className="alert alert-secondary">No upcoming events found.</div>
  );

  return (
    <div className="mb-5">
      <div className="d-flex align-items-center mb-3 gap-2">
        <span className="badge bg-danger" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>● LIVE DATA</span>
        <small className="text-muted">Auto-updated from ufcstats.com</small>
      </div>

      {events.map(event => (
        <div key={event.event_name} className="card mb-3" style={{ border: '1px solid #333' }}>
          {/* Event Header — clickable to expand/collapse */}
          <div
            className="card-header bg-dark d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => toggleEvent(event.event_name)}
          >
            <div>
              <h5 className="mb-0 text-white">{event.event_name}</h5>
              <small className="text-muted">{event.event_date} · {event.location}</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary">{event.fights.length} fights</span>
              <span className="text-white">{expanded[event.event_name] ? '▲' : '▼'}</span>
            </div>
          </div>

          {/* Fight Card — shown when expanded */}
          {expanded[event.event_name] && (
            <div className="card-body p-0">
              <table className="table table-dark table-hover mb-0">
                <thead>
                  <tr>
                    <th className="ps-3">Red Corner</th>
                    <th className="text-center">VS</th>
                    <th>Blue Corner</th>
                    <th>Division</th>
                    <th className="text-center">Predict</th>
                  </tr>
                </thead>
                <tbody>
                  {event.fights.map((fight, i) => (
                    <tr key={i}>
                      <td className="ps-3 text-danger fw-bold">{fight.red_fighter}</td>
                      <td className="text-center text-muted">vs</td>
                      <td className="text-primary fw-bold">{fight.blue_fighter}</td>
                      <td><span className="badge bg-secondary">{fight.weight_class}</span></td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onPredictFight(fight.red_fighter, fight.blue_fighter)}
                        >
                          Predict →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────

const FighterAnalyticsPage = () => {
  const [searchTerm, setSearchTerm]   = useState('');
  const [fighterData, setFighterData] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchFighters(searchTerm)
        .then(res => { setSuggestions(res.data); setShowSuggestions(true); })
        .catch(() => setSuggestions([]));
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
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (fighter) => {
    setSearchTerm(fighter);
    setShowSuggestions(false);
    setTimeout(handleSearch, 100);
  };

  // Called when user clicks "Predict →" on an upcoming fight
  const handlePredictFight = (red, blue) => {
    window.location.href = `/?red=${encodeURIComponent(red)}&blue=${encodeURIComponent(blue)}`;
  };

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
    <div className="w-100 py-4">
      <div className="card w-100" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="card-header bg-dark">
          <h1 className="mb-0">FIGHTER ANALYTICS</h1>
          <p className="mb-0 text-light">Detailed performance statistics for UFC fighters</p>
        </div>

        <div className="card-body fighter-card-body">

          {/* ── Fighter Search ── */}
          <h4 className="text-white mb-3">🔍 Fighter Lookup</h4>
          <div className="search-container mb-4 bg-dark" ref={searchRef} style={{ borderRadius: '10px' }}>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Search for a fighter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => searchTerm.length > 2 && setShowSuggestions(true)}
              />
              <button className="btn-analyze" onClick={handleSearch} disabled={loading}>
                {loading
                  ? <span className="spinner-border spinner-border-sm" role="status"></span>
                  : 'Analyze'}
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-box mt-2 rounded">
                {suggestions.map((fighter, index) => (
                  <div key={index} className="p-2 suggestion-item" onClick={() => handleSelectSuggestion(fighter)}>
                    {fighter}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {fighterData && !loading && (
            <div className="fighter-analytics">
              <div className="row mb-4">
                <div className="col-12">
                  <div className="fighter-header text-center p-4 mb-3 bg-dark">
                    <h2 className="display-4">{fighterData.basic_stats.name}</h2>
                    <div className="d-flex justify-content-center flex-wrap gap-3 mt-3">
                      {[
                        { value: `${fighterData.basic_stats.height || 'N/A'} cm`, label: 'Height'   },
                        { value: `${fighterData.basic_stats.reach  || 'N/A'} cm`, label: 'Reach'    },
                        { value: fighterData.basic_stats.age        || 'N/A',      label: 'Age'      },
                        { value: fighterData.basic_stats.weight_class || 'N/A',    label: 'Division' }
                      ].map(({ value, label }) => (
                        <div key={label} className="stat-badge">
                          <div className="stat-value">{value}</div>
                          <div className="stat-label">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-6 mb-3">
                  <div className="card h-100">
                    <div className="card-header bg-dark text-white"><h4>Career Performance</h4></div>
                    <div className="card-body d-flex flex-column">
                      <div className="row text-center mb-3">
                        {[
                          { val: fighterData.performance_metrics.total_fights, label: 'Total Fights', cls: 'metric-total' },
                          { val: fighterData.performance_metrics.wins,         label: 'Wins',         cls: 'metric-wins'  },
                          { val: fighterData.performance_metrics.losses,       label: 'Losses',       cls: 'metric-losses'}
                        ].map(({ val, label, cls }) => (
                          <div key={label} className="col-4">
                            <div className={`metric-value ${cls}`}>{val}</div>
                            <div className="text-black">{label}</div>
                          </div>
                        ))}
                      </div>
                      {performanceChartData && (
                        <div className="flex-grow-1" style={{ minHeight: '300px' }}>
                          <Bar data={performanceChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <div className="card h-100">
                    <div className="card-header bg-dark text-white"><h4>Win Methods</h4></div>
                    <div className="card-body d-flex flex-column">
                      <div className="row text-center mb-3">
                        {[
                          { val: fighterData.performance_metrics.ko_wins,       label: 'KO/TKO',      cls: 'metric-ko'  },
                          { val: fighterData.performance_metrics.sub_wins,      label: 'Submissions', cls: 'metric-sub' },
                          { val: fighterData.performance_metrics.decision_wins, label: 'Decisions',   cls: 'metric-dec' }
                        ].map(({ val, label, cls }) => (
                          <div key={label} className="col-4">
                            <div className={`metric-value ${cls}`}>{val}</div>
                            <div className="text-black">{label}</div>
                          </div>
                        ))}
                      </div>
                      {winMethodChartData && (
                        <div className="flex-grow-1" style={{ minHeight: '300px' }}>
                          <Pie data={winMethodChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-dark"><h4 className="text-white">Recent Fight History</h4></div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-dark table-striped fight-table">
                          <thead>
                            <tr>
                              <th>Date</th><th>Opponent</th><th>Result</th>
                              <th>Method</th><th>Weight Class</th><th>Rounds</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fighterData.fight_history.map((fight, index) => (
                              <tr key={index}>
                                <td>{fight.date}</td>
                                <td>{fight.opponent}</td>
                                <td>
                                  <span className={`badge ${
                                    fight.result === 'Win'  ? 'bg-success' :
                                    fight.result === 'Loss' ? 'bg-danger'  : 'bg-warning'
                                  }`}>{fight.result}</span>
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

          {!fighterData && !loading && (
            <div className="text-center py-5 empty-state">
              <i className="fas fa-user-ninja fa-5x mb-4"></i>
              <h3>Search for a Fighter</h3>
              <p>Enter a fighter's name to view detailed performance analytics and fight history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FighterAnalyticsPage;
