import React, { useState } from 'react';
import { getFighterStats, searchFighters } from '../services/api';
import '../fc.css';

const FighterComparison = () => {
  const [fighter1, setFighter1] = useState('');
  const [fighter2, setFighter2] = useState('');
  const [stats1, setStats1] = useState(null);
  const [stats2, setStats2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchResults1, setSearchResults1] = useState([]);
  const [searchResults2, setSearchResults2] = useState([]);
  const [showResults1, setShowResults1] = useState(false);
  const [showResults2, setShowResults2] = useState(false);

  // Handle search for fighter 1
  const handleSearch1 = async (term) => {
    setFighter1(term);
    if (term.length > 2) {
      const results = await searchFighters(term);
      setSearchResults1(results.data);
      setShowResults1(true);
    } else {
      setShowResults1(false);
    }
  };

  // Handle search for fighter 2
  const handleSearch2 = async (term) => {
    setFighter2(term);
    if (term.length > 2) {
      const results = await searchFighters(term);
      setSearchResults2(results.data);
      setShowResults2(true);
    } else {
      setShowResults2(false);
    }
  };

  // Handle selection for fighter 1
  const handleSelectFighter1 = (fighter) => {
    setFighter1(fighter);
    setShowResults1(false);
    setStats1(null);
  };

  // Handle selection for fighter 2
  const handleSelectFighter2 = (fighter) => {
    setFighter2(fighter);
    setShowResults2(false);
    setStats2(null);
  };

  const handleSearch = async () => {
    if (!fighter1 || !fighter2) return;

    setLoading(true);
    try {
      const response1 = await getFighterStats(fighter1);
      const response2 = await getFighterStats(fighter2);
      setStats1(response1.data);
      setStats2(response2.data);
    } catch (error) {
      console.error('Error fetching fighter stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats to compare
  const statFields = [
    { label: 'Height (cm)', key: 'height' },
    { label: 'Reach (cm)', key: 'reach' },
    { label: 'Age', key: 'age' },
    { label: 'Stance', key: 'stance' },
    { label: 'Weight Class', key: 'weight_class' },
    { label: 'Win Streak', key: 'win_streak' },
    { label: 'KO Wins', key: 'ko_wins' },
    { label: 'Total Fights', key: 'total_fights' },
    { label: 'Avg Sig Strikes', key: 'avg_sig_str' },
    { label: 'Avg Takedown %', key: 'avg_td_pct' },
    { label: 'Avg Submission Attempts', key: 'avg_sub_att' },
  ];

  // Calculate advantage indicators
  const calculateAdvantage = (stat1, stat2) => {
    if (stat1 > stat2) return { value: stat1 - stat2, winner: 1 };
    if (stat2 > stat1) return { value: stat2 - stat1, winner: 2 };
    return { value: 0, winner: 0 };
  };

  // Render radar chart
  const renderRadarChart = () => {
    if (!stats1 || !stats2) return null;

    const radarStats = [
      { name: 'Striking', key: 'avg_sig_str' },
      { name: 'Grappling', key: 'avg_td_pct' },
      { name: 'Submissions', key: 'avg_sub_att' },
      { name: 'Experience', key: 'total_fights' },
      { name: 'Knockouts', key: 'ko_wins' },
      { name: 'Win Streak', key: 'win_streak' }
    ];

    const maxValues = {};
    radarStats.forEach(stat => {
      maxValues[stat.key] = Math.max(
        stats1[stat.key] || 0,
        stats2[stat.key] || 0,
        1
      );
    });

    const size = 200;
    const center = size / 2;
    const radius = size * 0.4;
    const points = radarStats.length;
    const angle = (2 * Math.PI) / points;

    return (
      <div className="radar-container" style={{width: size, height: size}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(level => (
            <circle
              key={level}
              cx={center}
              cy={center}
              r={radius * level}
              fill="none"
              stroke="#333"
              strokeWidth="0.5"
            />
          ))}

          {/* Axes */}
          {radarStats.map((stat, i) => {
            const x = center + radius * Math.cos(i * angle - Math.PI / 2);
            const y = center + radius * Math.sin(i * angle - Math.PI / 2);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#444"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Fighter 1 area */}
          <polygon
            points={radarStats.map((stat, i) => {
              const value = (stats1[stat.key] || 0) / maxValues[stat.key];
              const x = center + radius * value * Math.cos(i * angle - Math.PI / 2);
              const y = center + radius * value * Math.sin(i * angle - Math.PI / 2);
              return `${x},${y}`;
            }).join(' ')}
            fill="rgba(231, 76, 60, 0.4)"
            stroke="#e74c3c"
            strokeWidth="2"
          />

          {/* Fighter 2 area */}
          <polygon
            points={radarStats.map((stat, i) => {
              const value = (stats2[stat.key] || 0) / maxValues[stat.key];
              const x = center + radius * value * Math.cos(i * angle - Math.PI / 2);
              const y = center + radius * value * Math.sin(i * angle - Math.PI / 2);
              return `${x},${y}`;
            }).join(' ')}
            fill="rgba(52, 152, 219, 0.4)"
            stroke="#3498db"
            strokeWidth="2"
          />

          {/* Labels */}
          {radarStats.map((stat, i) => {
            const x = center + (radius + 15) * Math.cos(i * angle - Math.PI / 2);
            const y = center + (radius + 15) * Math.sin(i * angle - Math.PI / 2);
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="10"
              >
                {stat.name}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="radar-legend">
          <div className="legend-item">
            <div className="legend-color-box" style={{backgroundColor: 'rgba(231, 76, 60, 0.4)'}}></div>
            <span className="legend-text">{fighter1}</span>
          </div>
          <div className="legend-item">
            <div className="legend-color-box" style={{backgroundColor: 'rgba(52, 152, 219, 0.4)'}}></div>
            <span className="legend-text">{fighter2}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render advantage cards
  const renderAdvantageCards = () => {
    if (!stats1 || !stats2) return null;

    const advantages = [
      { name: 'Striking Power', key: 'avg_sig_str', icon: 'fa-fist-raised' },
      { name: 'Grappling', key: 'avg_td_pct', icon: 'fa-wrestling' },
      { name: 'Submissions', key: 'avg_sub_att', icon: 'fa-lock' },
      { name: 'Experience', key: 'total_fights', icon: 'fa-history' }
    ];

    return (
      <div className="advantages-container">
        {advantages.map(adv => {
          const advantage = calculateAdvantage(stats1[adv.key], stats2[adv.key]);
          if (advantage.value === 0) return null;

          return (
            <div key={adv.key} className="advantage-card">
              <div className="advantage-header">
                <i className={`fas ${adv.icon} advantage-icon ${advantage.winner === 1 ? 'red-icon' : 'blue-icon'}`}></i>
                <h5 className="advantage-name">{adv.name}</h5>
              </div>
              <div className="advantage-value">
                <span className="advantage-label">Advantage:</span>
                <div className={`advantage-fighter ${advantage.winner === 1 ? 'red-fighter' : 'blue-fighter'}`}>
                  {advantage.winner === 1 ? fighter1 : fighter2}
                </div>
              </div>
              <div className="advantage-bar-container">
                <div
                  className={`advantage-bar ${advantage.winner === 1 ? 'red-bar' : 'blue-bar'}`}
                  style={{ width: `${Math.min(100, advantage.value * 10)}%` }}
                ></div>
              </div>
              <div className="advantage-numbers">
                <span>{stats1[adv.key] || 0}</span>
                <span>{stats2[adv.key] || 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card w-100">
      <div className="card-header bg-dark py-2">
        <h1 className="mb-0 h4">
          <i className="fas fa-balance-scale me-2"></i> Fighter Comparison Tool
        </h1>
      </div>

      <div className="card-body d-flex flex-column p-3">
        <div className="row flex-grow-1 mb-3">
          {/* Fighter 1 Card */}
          <div className="col-md-5 d-flex flex-column">
            <div className="fighter-card red-corner">
              <h3 className="corner-title">Red Corner</h3>
              <div className="search-container">
                <input
                  type="text"
                  className="search-input"
                  value={fighter1}
                  onChange={(e) => handleSearch1(e.target.value)}
                  placeholder="Search fighter..."
                />
                {showResults1 && searchResults1.length > 0 && (
                  <div className="search-results">
                    {searchResults1.map((fighter, index) => (
                      <div
                        key={index}
                        className="search-item"
                        onClick={() => handleSelectFighter1(fighter)}
                      >
                        <i className="fas fa-user me-2"></i>
                        {fighter}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {stats1 && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats1.height || 'N/A'}</div>
                    <div className="stat-label">Height</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats1.reach || 'N/A'}</div>
                    <div className="stat-label">Reach</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats1.age || 'N/A'}</div>
                    <div className="stat-label">Age</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats1.win_streak || '0'}</div>
                    <div className="stat-label">Win Streak</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* VS Badge */}
          <div className="col-md-2 d-flex align-items-center justify-content-center">
            <div className="vs-badge">VS</div>
          </div>

          {/* Fighter 2 Card */}
          <div className="col-md-5 d-flex flex-column">
            <div className="fighter-card blue-corner">
              <h3 className="corner-title">Blue Corner</h3>
              <div className="search-container">
                <input
                  type="text"
                  className="search-input"
                  value={fighter2}
                  onChange={(e) => handleSearch2(e.target.value)}
                  placeholder="Search fighter..."
                />
                {showResults2 && searchResults2.length > 0 && (
                  <div className="search-results">
                    {searchResults2.map((fighter, index) => (
                      <div
                        key={index}
                        className="search-item"
                        onClick={() => handleSelectFighter2(fighter)}
                      >
                        <i className="fas fa-user me-2"></i>
                        {fighter}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {stats2 && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats2.height || 'N/A'}</div>
                    <div className="stat-label">Height</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats2.reach || 'N/A'}</div>
                    <div className="stat-label">Reach</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats2.age || 'N/A'}</div>
                    <div className="stat-label">Age</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats2.win_streak || '0'}</div>
                    <div className="stat-label">Win Streak</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compare Button */}
        <div className="mt-auto">
          <button
            className="btn-predict"
            onClick={handleSearch}
            disabled={!fighter1 || !fighter2 || loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                COMPARING FIGHTERS...
              </>
            ) : (
              <>
                <i className="fas fa-balance-scale me-2"></i> COMPARE FIGHTERS
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {stats1 && stats2 && (
          <div className="result-container mt-3">
            <h3 className="text-center mb-3">Detailed Comparison Analysis</h3>

            {/* Stats Comparison */}
            <div className="mb-4">
              <h4 className="section-title mb-3">Statistical Comparison</h4>
              <div className="row">
                <div className="col-md-6">
                  <div className="fighter-header red-header p-3 mb-3">
                    <h4 className="fighter-name text-center mb-0">{fighter1}</h4>
                  </div>
                  <div className="stats-list">
                    {statFields.map(field => (
                      <div key={field.key} className="stat-item d-flex justify-content-between py-2 border-bottom">
                        <span className="stat-label">{field.label}:</span>
                        <span className="stat-value">
                          {stats1[field.key] || 'N/A'}
                          {stats1[field.key] > stats2[field.key] && (
                            <i className="fas fa-arrow-up text-success ms-2"></i>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="fighter-header blue-header p-3 mb-3">
                    <h4 className="fighter-name text-center mb-0">{fighter2}</h4>
                  </div>
                  <div className="stats-list">
                    {statFields.map(field => (
                      <div key={field.key} className="stat-item d-flex justify-content-between py-2 border-bottom">
                        <span className="stat-label">{field.label}:</span>
                        <span className="stat-value">
                          {stats2[field.key] || 'N/A'}
                          {stats2[field.key] > stats1[field.key] && (
                            <i className="fas fa-arrow-up text-success ms-2"></i>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Comparison */}
            <div className="mb-4">
              <h4 className="section-title mb-3">Visual Analysis</h4>
              <div className="row">
                <div className="col-md-6">
                  <h5 className="sub-section-title text-center mb-3">Key Metrics Comparison</h5>
                  <div className="metrics-grid">
                    {['height', 'reach', 'avg_sig_str', 'avg_td_pct', 'win_streak', 'ko_wins'].map(metric => (
                      <div key={metric} className="metric-card p-3 mb-3">
                        <h6 className="metric-title text-center">
                          {metric.replace(/_/g, ' ').toUpperCase()}
                        </h6>
                        <div className="metric-comparison d-flex justify-content-between align-items-center mb-2">
                          <div className="metric-value-group text-center">
                            <div className="metric-value red-metric p-2">
                              {stats1[metric] || 0}
                            </div>
                            <small className="metric-label">{fighter1}</small>
                          </div>
                          <div className="metric-vs-badge">
                            VS
                          </div>
                          <div className="metric-value-group text-center">
                            <div className="metric-value blue-metric p-2">
                              {stats2[metric] || 0}
                            </div>
                            <small className="metric-label">{fighter2}</small>
                          </div>
                        </div>
                        {typeof stats1[metric] === 'number' && typeof stats2[metric] === 'number' && (
                          <div className="metric-bar-container">
                            <div
                              className="metric-bar red-bar"
                              style={{ width: `${(stats1[metric]/(stats1[metric] + stats2[metric])) * 100}%` }}
                            ></div>
                            <div
                              className="metric-bar blue-bar"
                              style={{ width: `${(stats2[metric]/(stats1[metric] + stats2[metric])) * 100}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-md-6">
                  <h5 className="sub-section-title text-center mb-3">Skills Radar Chart</h5>
                  {renderRadarChart()}
                  <p className="radar-description text-center mt-2">
                    The radar chart visualizes each fighter's strengths across key skill categories.
                    The larger the area, the more dominant the fighter in that category.
                  </p>
                </div>
              </div>

              {/* Advantage Indicators */}
              {renderAdvantageCards()}
            </div>

            {/* Final Comparison */}
            <div className="final-container">
              <h4 className="section-title text-center mb-3">Final Comparison Analysis</h4>
              <div className="final-score d-flex justify-content-around align-items-center mb-4">
                <div className="score-group text-center">
                  <div className="score-circle red-score mx-auto d-flex align-items-center justify-content-center mb-2">
                    <span className="score-value">
                      {Object.keys(stats1).filter(key =>
                        statFields.some(f => f.key === key) &&
                        stats1[key] > stats2[key]
                      ).length}
                    </span>
                  </div>
                  <h5 className="fighter-score-name">{fighter1}</h5>
                  <p className="score-label">Categories Won</p>
                </div>

                <div className="score-vs">
                  VS
                </div>

                <div className="score-group text-center">
                  <div className="score-circle blue-score mx-auto d-flex align-items-center justify-content-center mb-2">
                    <span className="score-value">
                      {Object.keys(stats2).filter(key =>
                        statFields.some(f => f.key === key) &&
                        stats2[key] > stats1[key]
                      ).length}
                    </span>
                  </div>
                  <h5 className="fighter-score-name">{fighter2}</h5>
                  <p className="score-label">Categories Won</p>
                </div>
              </div>

              <div className="insights-container p-3">
                <h5 className="insights-title">
                  <i className="fas fa-lightbulb me-2"></i>
                  Key Insights
                </h5>
                <ul className="insights-list mb-0">
                  <li className="insight-item">
                    <strong className="red-highlight">{fighter1}</strong> has the advantage in striking power with <strong>{stats1.avg_sig_str || 0}</strong> significant strikes per minute.
                  </li>
                  <li className="insight-item">
                    <strong className="blue-highlight">{fighter2}</strong> has superior grappling with a <strong>{stats2.avg_td_pct || 0}%</strong> takedown accuracy.
                  </li>
                  <li className="insight-item">
                    With <strong>{stats1.total_fights || 0}</strong> fights, <strong className="red-highlight">{fighter1}</strong> has more experience in the octagon.
                  </li>
                  <li className="insight-item">
                    <strong className="blue-highlight">{fighter2}</strong> is on a <strong>{stats2.win_streak || 0}</strong> fight win streak coming into this matchup.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FighterComparison;
