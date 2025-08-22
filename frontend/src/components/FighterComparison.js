import React, { useState } from 'react';
import { getFighterStats, searchFighters } from '../services/api';
import '../fc.css';  // Make sure this path is correct

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

  // Radar chart data
  const radarStats = [
    { name: 'Striking', key: 'avg_sig_str' },
    { name: 'Grappling', key: 'avg_td_pct' },
    { name: 'Submissions', key: 'avg_sub_att' },
    { name: 'Experience', key: 'total_fights' },
    { name: 'Knockouts', key: 'ko_wins' },
    { name: 'Win Streak', key: 'win_streak' }
  ];

  // Render radar chart
  const renderRadarChart = () => {
    if (!stats1 || !stats2) return null;

    const maxValues = {};
    radarStats.forEach(stat => {
      maxValues[stat.key] = Math.max(
          stats1[stat.key] || 0,
          stats2[stat.key] || 0,
          1 // Ensure at least 1 to avoid division by zero
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
                fill="rgba(192, 10, 10, 0.4)"
                stroke="#c00a0a"
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
                fill="rgba(10, 79, 212, 0.4)"
                stroke="#0a4fd2"
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
              <div className="legend-color-box red-legend-box"></div>
              <span className="legend-text">{fighter1}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color-box blue-legend-box"></div>
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
            <div key={adv.key} className={`advantage-card ${advantage.winner === 1 ? 'red-advantage' : 'blue-advantage'}`}>
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
    <div className="fighter-comparison">
      <div className="comparison-container">
        <div className="header-section">
          <h1 className="main-title">
            <i className="fas fa-balance-scale title-icon"></i>
            Fighter Comparison Tool
          </h1>
          <div className="analytics-badge">
            UFC PERFORMANCE ANALYTICS
          </div>
        </div>

        {/* Search Section */}
        <div className="search-container">
          <h2 className="section-title">
            Select Fighters to Compare
          </h2>

          <div className="search-inputs">
            <div className="fighter-input-group">
              <label className="input-label red-corner">
                <i className="fas fa-fist-raised label-icon"></i>
                Red Corner Fighter
              </label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input red-input"
                  value={fighter1}
                  onChange={(e) => handleSearch1(e.target.value)}
                  placeholder="Enter fighter name"
                />
                {showResults1 && searchResults1.length > 0 && (
                  <div className="search-results red-results">
                    {searchResults1.map((fighter, index) => (
                      <div
                        key={index}
                        className="result-item"
                        onClick={() => handleSelectFighter1(fighter)}
                      >
                        <i className="fas fa-user result-icon"></i>
                        {fighter}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="vs-badge">
              VS
            </div>

            <div className="fighter-input-group">
              <label className="input-label blue-corner">
                <i className="fas fa-shield-alt label-icon"></i>
                Blue Corner Fighter
              </label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input blue-input"
                  value={fighter2}
                  onChange={(e) => handleSearch2(e.target.value)}
                  placeholder="Enter fighter name"
                />
                {showResults2 && searchResults2.length > 0 && (
                  <div className="search-results blue-results">
                    {searchResults2.map((fighter, index) => (
                      <div
                        key={index}
                        className="result-item"
                        onClick={() => handleSelectFighter2(fighter)}
                      >
                        <i className="fas fa-user result-icon"></i>
                        {fighter}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="search-button-container">
            <button
              className="compare-button"
              onClick={handleSearch}
              disabled={!fighter1 || !fighter2 || loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin button-icon"></i>
                  ANALYZING FIGHTERS...
                </>
              ) : (
                <>
                  <i className="fas fa-search button-icon"></i>
                  COMPARE FIGHTERS
                </>
              )}
            </button>
          </div>
        </div>

        {(stats1 && stats2) && (
          <div>
            {/* Stats Comparison */}
            <div className="stats-container">
              <h2 className="section-title with-underline">
                STATISTICAL COMPARISON
              </h2>

              <div className="fighter-stats">
                <div className="fighter-column">
                  <div className="fighter-header red-header">
                    <h3 className="fighter-name">{fighter1}</h3>
                  </div>
                  <div className="stats-list">
                    {statFields.map(field => (
                      <div
                        key={field.key}
                        className="stat-item"
                      >
                        <span className="stat-label">{field.label}:</span>
                        <span className="stat-value">
                          {stats1[field.key] || 'N/A'}
                        </span>
                        {stats1[field.key] > stats2[field.key] && (
                          <div className="stat-arrow red-arrow">
                            <i className="fas fa-arrow-up"></i>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="fighter-column">
                  <div className="fighter-header blue-header">
                    <h3 className="fighter-name">{fighter2}</h3>
                  </div>
                  <div className="stats-list">
                    {statFields.map(field => (
                      <div
                        key={field.key}
                        className="stat-item"
                      >
                        <span className="stat-label">{field.label}:</span>
                        <span className="stat-value">
                          {stats2[field.key] || 'N/A'}
                        </span>
                        {stats2[field.key] > stats1[field.key] && (
                          <div className="stat-arrow blue-arrow">
                            <i className="fas fa-arrow-up"></i>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Comparison */}
            <div className="visual-container">
              <h2 className="section-title with-underline">
                VISUAL ANALYSIS
              </h2>

              <div className="visual-grid">
                <div className="metrics-section">
                  <h3 className="sub-section-title">
                    KEY METRICS COMPARISON
                  </h3>
                  <div className="metrics-grid">
                    {['height', 'reach', 'avg_sig_str', 'avg_td_pct', 'win_streak', 'ko_wins'].map(metric => (
                      <div key={metric} className="metric-card">
                        <h5 className="metric-title">
                          {metric.replace(/_/g, ' ')}
                        </h5>
                        <div className="metric-comparison">
                          <div className="metric-value-group">
                            <div className="metric-value red-metric">
                              {stats1[metric] || 0}
                            </div>
                            <small className="metric-label">{fighter1}</small>
                          </div>
                          <div className="metric-vs-badge">
                            VS
                          </div>
                          <div className="metric-value-group">
                            <div className="metric-value blue-metric">
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

                <div className="radar-section">
                  <h3 className="sub-section-title">
                    SKILLS RADAR CHART
                  </h3>
                  {renderRadarChart()}
                  <p className="radar-description">
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
              <h2 className="section-title">
                FINAL COMPARISON ANALYSIS
              </h2>
              <div className="final-score">
                <div className="score-group">
                  <div className="score-circle red-score">
                    <span className="score-value">
                      {Object.keys(stats1).filter(key =>
                        statFields.some(f => f.key === key) &&
                        stats1[key] > stats2[key]
                      ).length}
                    </span>
                  </div>
                  <h3 className="fighter-score-name">{fighter1}</h3>
                  <p className="score-label">Categories Won</p>
                </div>

                <div className="score-vs">
                  VS
                </div>

                <div className="score-group">
                  <div className="score-circle blue-score">
                    <span className="score-value">
                      {Object.keys(stats2).filter(key =>
                        statFields.some(f => f.key === key) &&
                        stats2[key] > stats1[key]
                      ).length}
                    </span>
                  </div>
                  <h3 className="fighter-score-name">{fighter2}</h3>
                  <p className="score-label">Categories Won</p>
                </div>
              </div>

              <div className="insights-container">
                <h3 className="insights-title">
                  <i className="fas fa-lightbulb insights-icon"></i>
                  Key Insights
                </h3>
                <ul className="insights-list">
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
