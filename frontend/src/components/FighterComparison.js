import React, { useState } from 'react';
import { getFighterStats, searchFighters } from '../services/api';
import '../fc.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

  // Render Horizontal Bar Chart
  const renderBarChart = () => {
    if (!stats1 || !stats2) return null;

    const barStats = [
      { name: 'Striking', f1: stats1.avg_sig_str || 0, f2: stats2.avg_sig_str || 0 },
      { name: 'Grappling', f1: stats1.avg_td_pct || 0, f2: stats2.avg_td_pct || 0 },
      { name: 'Submissions', f1: stats1.avg_sub_att || 0, f2: stats2.avg_sub_att || 0 },
      { name: 'Experience', f1: stats1.total_fights || 0, f2: stats2.total_fights || 0 },
      { name: 'Knockouts', f1: stats1.ko_wins || 0, f2: stats2.ko_wins || 0 },
      { name: 'Win Streak', f1: stats1.win_streak || 0, f2: stats2.win_streak || 0 },
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={barStats}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 50, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis type="number" stroke="#fff" />
          <YAxis dataKey="name" type="category" stroke="#fff" />
          <Tooltip />
          <Legend />
          <Bar dataKey="f1" fill="#e74c3c" name={fighter1} />
          <Bar dataKey="f2" fill="#3498db" name={fighter2} />
        </BarChart>
      </ResponsiveContainer>
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
                  <div
                      className={`advantage-fighter ${advantage.winner === 1 ? 'red-fighter' : 'blue-fighter'}`}>
                    {advantage.winner === 1 ? fighter1 : fighter2}
                  </div>
                </div>
                <div className="advantage-bar-container">
                  <div
                      className="red-fill"
                      style={{width: `${(stats1[adv.key] / (stats1[adv.key] + stats2[adv.key])) * 100}%`}}
                  ></div>
                  <div
                      className="blue-fill"
                      style={{width: `${(stats2[adv.key] / (stats1[adv.key] + stats2[adv.key])) * 100}%`}}
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
            <i className="fas fa-balance-scale me-2"></i> Fighter Comparison
            Tool
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

            {/* Visual Comparison */}
            <div className="mb-4">
              <h4 className="section-title mb-3">Visual Analysis</h4>
              <div className="row">
                <div className="col-md-12">
                  <h5 className="sub-section-title text-center mb-3">Key Skills Comparison</h5>
                  {renderBarChart()}
                </div>
              </div>

              {/* Advantage Indicators */}
              {renderAdvantageCards()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FighterComparison;
