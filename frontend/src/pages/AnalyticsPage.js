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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

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

  const handleSearch = async (nameOverride) => {
    const name = nameOverride || searchTerm;
    if (!name) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const response = await getFighterAnalyticsDetails(name);
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
    handleSearch(fighter);
  };

  // Use basic_stats for charts since performance_metrics requires fight history
  const bs = fighterData?.basic_stats || {};

  const performanceChartData = fighterData ? {
    labels: ['Total Fights', 'KO Wins', 'Win Streak', 'Sub Attempts'],
    datasets: [{
      label: 'Count',
      data: [
        bs.total_fights || 0,
        bs.ko_wins      || 0,
        bs.win_streak   || 0,
        Math.round(bs.avg_sub_att || 0)
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

  const strikeVsGrappleData = fighterData ? {
    labels: ['Striking (SigStr/min)', 'Takedowns/15min', 'Sub Attempts/15min'],
    datasets: [{
      data: [
        bs.avg_sig_str || 0,
        bs.avg_td_pct  || 0,
        bs.avg_sub_att || 0
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

          {/* Fighter Search */}
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
              <button className="btn-analyze" onClick={() => handleSearch()} disabled={loading}>
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

              {/* Header */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="fighter-header text-center p-4 mb-3 bg-dark">
                    <h2 className="display-4">{bs.name}</h2>
                    <div className="d-flex justify-content-center flex-wrap gap-3 mt-3">
                      {[
                        { value: bs.height     ? `${bs.height} cm`  : 'N/A', label: 'Height'   },
                        { value: bs.reach      ? `${bs.reach} cm`   : 'N/A', label: 'Reach'    },
                        { value: bs.age        || 'N/A',                       label: 'Age'      },
                        { value: bs.weight_class || 'N/A',                     label: 'Division' },
                        { value: bs.win_streak || 0,                           label: 'Win Streak'},
                        { value: bs.ko_wins    || 0,                           label: 'KO Wins'  },
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

              {/* Charts */}
              <div className="row mb-4">
                <div className="col-md-6 mb-3">
                  <div className="card h-100">
                    <div className="card-header bg-dark text-white"><h4>Career Overview</h4></div>
                    <div className="card-body d-flex flex-column">
                      <div className="row text-center mb-3">
                        {[
                          { val: bs.total_fights || 0, label: 'Total Fights', cls: 'metric-total' },
                          { val: bs.ko_wins      || 0, label: 'KO Wins',      cls: 'metric-wins'  },
                          { val: bs.win_streak   || 0, label: 'Win Streak',   cls: 'metric-losses'}
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
                    <div className="card-header bg-dark text-white"><h4>Fighting Style</h4></div>
                    <div className="card-body d-flex flex-column">
                      <div className="row text-center mb-3">
                        {[
                          { val: bs.avg_sig_str ? bs.avg_sig_str.toFixed(1) : 0, label: 'Sig Str/min', cls: 'metric-ko'  },
                          { val: bs.avg_td_pct  ? bs.avg_td_pct.toFixed(1)  : 0, label: 'TD/15min',    cls: 'metric-sub' },
                          { val: bs.avg_sub_att ? bs.avg_sub_att.toFixed(1) : 0, label: 'Sub Att/15m', cls: 'metric-dec' }
                        ].map(({ val, label, cls }) => (
                          <div key={label} className="col-4">
                            <div className={`metric-value ${cls}`}>{val}</div>
                            <div className="text-black">{label}</div>
                          </div>
                        ))}
                      </div>
                      {strikeVsGrappleData && (
                        <div className="flex-grow-1" style={{ minHeight: '300px' }}>
                          <Pie data={strikeVsGrappleData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fight History */}
              <div className="row">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-dark"><h4 className="text-white">Recent Fight History</h4></div>
                    <div className="card-body">
                      {fighterData.fight_history && fighterData.fight_history.length > 0 ? (
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
                      ) : (
                        <div className="text-center py-4 text-muted">
                          <i className="fas fa-history fa-3x mb-3 d-block"></i>
                          <p>Fight history not available for this fighter.</p>
                        </div>
                      )}
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
