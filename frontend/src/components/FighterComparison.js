import React, { useState } from 'react';
import { getFighterStats, searchFighters } from '../services/api';
import '../fc.css';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

// ── Weights reflect actual MMA importance ────────────────────────────────────
// Grappling control and defense are the foundation of modern MMA
// Striking defense matters more than offense (you can't strike if taken down)
// Win streak reflects current form
const SCORECARD = [
  {
    key:     'avg_td_pct',
    label:   'Takedown Accuracy',
    weight:  3.5,
    desc:    'How often takedowns land — core of wrestling-based MMA',
    higher:  'better',
  },
  {
    key:     'avg_sig_str',
    label:   'Striking Output',
    weight:  2.0,
    desc:    'Significant strikes landed per minute',
    higher:  'better',
  },
  {
    key:     'win_streak',
    label:   'Current Form',
    weight:  2.0,
    desc:    'Active win streak — momentum matters',
    higher:  'better',
  },
  {
    key:     'ko_wins',
    label:   'Finishing Power',
    weight:  1.5,
    desc:    'KO/TKO wins — finishing ability',
    higher:  'better',
  },
  {
    key:     'reach',
    label:   'Reach Advantage',
    weight:  0.5,
    desc:    'Physical reach in cm',
    higher:  'better',
  },
];

const FighterComparison = () => {
  const [fighter1, setFighter1]         = useState('');
  const [fighter2, setFighter2]         = useState('');
  const [stats1, setStats1]             = useState(null);
  const [stats2, setStats2]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [searchResults1, setSearchResults1] = useState([]);
  const [searchResults2, setSearchResults2] = useState([]);
  const [showResults1, setShowResults1] = useState(false);
  const [showResults2, setShowResults2] = useState(false);

  const handleSearch1 = async (term) => {
    setFighter1(term);
    if (term.length > 2) {
      const results = await searchFighters(term);
      setSearchResults1(results.data);
      setShowResults1(true);
    } else setShowResults1(false);
  };

  const handleSearch2 = async (term) => {
    setFighter2(term);
    if (term.length > 2) {
      const results = await searchFighters(term);
      setSearchResults2(results.data);
      setShowResults2(true);
    } else setShowResults2(false);
  };

  const handleSelectFighter1 = (f) => { setFighter1(f); setShowResults1(false); setStats1(null); };
  const handleSelectFighter2 = (f) => { setFighter2(f); setShowResults2(false); setStats2(null); };

  const handleCompare = async () => {
    if (!fighter1 || !fighter2) return;
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([getFighterStats(fighter1), getFighterStats(fighter2)]);
      setStats1(r1.data);
      setStats2(r2.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Radar chart data ────────────────────────────────────────────────────────
  const getRadarData = () => {
    if (!stats1 || !stats2) return [];

    // Normalize each stat to 0-100 scale for radar
    const normalize = (v1, v2) => {
      const max = Math.max(v1, v2, 0.001);
      return { n1: (v1 / max) * 100, n2: (v2 / max) * 100 };
    };

    return SCORECARD.map(cat => {
      const v1 = stats1[cat.key] || 0;
      const v2 = stats2[cat.key] || 0;
      const { n1, n2 } = normalize(v1, v2);
      return { subject: cat.label, [fighter1]: n1, [fighter2]: n2 };
    });
  };

  // ── Weighted scorecard ──────────────────────────────────────────────────────
  const getScorecard = () => {
    if (!stats1 || !stats2) return { score1: 0, score2: 0, rows: [] };

    let score1 = 0;
    let score2 = 0;

    const rows = SCORECARD.map(cat => {
      const v1 = stats1[cat.key] || 0;
      const v2 = stats2[cat.key] || 0;
      let winner = 0;

      if (v1 > v2) { score1 += cat.weight; winner = 1; }
      else if (v2 > v1) { score2 += cat.weight; winner = 2; }

      return { ...cat, v1, v2, winner };
    });

    return { score1, score2, rows };
  };

  const renderSearchBox = (value, onChange, results, show, onSelect, corner) => (
    <div className={`fighter-card ${corner}-corner p-3 mb-3 bg-dark`} style={{ minHeight: '160px' }}>
      <h3 className="corner-title">{corner === 'red' ? 'Red Corner' : 'Blue Corner'}</h3>
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Search fighter..."
        />
        {show && results.length > 0 && (
          <div className="search-results">
            {results.map((f, i) => (
              <div key={i} className="search-item" onClick={() => onSelect(f)}>
                <i className="fas fa-user me-2"></i>{f}
              </div>
            ))}
          </div>
        )}
      </div>
      {(corner === 'red' ? stats1 : stats2) && (
        <div className="stats-grid mt-2">
          {[
            { label: 'Height', val: `${(corner === 'red' ? stats1 : stats2).height || 'N/A'} cm` },
            { label: 'Reach',  val: `${(corner === 'red' ? stats1 : stats2).reach  || 'N/A'} cm` },
            { label: 'Age',    val: (corner === 'red' ? stats1 : stats2).age        || 'N/A'      },
            { label: 'Streak', val: (corner === 'red' ? stats1 : stats2).win_streak || '0'        },
          ].map(({ label, val }) => (
            <div key={label} className="stat-card">
              <div className="stat-value">{val}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const { score1, score2, rows } = getScorecard();

  // Bar chart — only meaningful numeric stats
  const barData = stats1 && stats2 ? [
    { name: 'Takedown %',  f1: stats1.avg_td_pct  || 0, f2: stats2.avg_td_pct  || 0 },
    { name: 'Striking',    f1: stats1.avg_sig_str  || 0, f2: stats2.avg_sig_str  || 0 },
    { name: 'KO Wins',     f1: stats1.ko_wins      || 0, f2: stats2.ko_wins      || 0 },
    { name: 'Win Streak',  f1: stats1.win_streak   || 0, f2: stats2.win_streak   || 0 },
  ] : [];

  return (
    <div className="card w-100">
      <div className="card-header bg-dark py-2">
        <h1 className="mb-0 h4">
          <i className="fas fa-balance-scale me-2"></i> Fighter Comparison Tool
        </h1>
      </div>

      <div className="card-body d-flex flex-column p-3">
        {/* Fighter cards */}
        <div className="row flex-grow-1 mb-3">
          <div className="col-md-5">
            {renderSearchBox(fighter1, handleSearch1, searchResults1, showResults1, handleSelectFighter1, 'red')}
          </div>
          <div className="col-md-2 d-flex align-items-center justify-content-center">
            <div className="vs-badge">VS</div>
          </div>
          <div className="col-md-5">
            {renderSearchBox(fighter2, handleSearch2, searchResults2, showResults2, handleSelectFighter2, 'blue')}
          </div>
        </div>

        {/* Compare button */}
        <div className="mt-auto mb-3">
          <button
            className="btn-predict p-3 bg-dark w-100"
            onClick={handleCompare}
            disabled={!fighter1 || !fighter2 || loading}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>COMPARING...</>
              : <><i className="fas fa-balance-scale me-2"></i>COMPARE FIGHTERS</>
            }
          </button>
        </div>

        {/* Results */}
        {stats1 && stats2 && (
          <div className="result-container mt-2 p-3 bg-dark">
            <h3 className="text-center mb-4 pb-2 border-bottom border-white">
              Comparison Analysis
            </h3>

            <div className="row mb-4">
              {/* Bar chart */}
              <div className="col-md-6 mb-3">
                <h5 className="text-white text-center mb-3">Key Stats</h5>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical"
                    margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                    <XAxis type="number" stroke="#fff" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" stroke="#fff" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#222', border: '1px solid #444' }} />
                    <Legend />
                    <Bar dataKey="f1" fill="#e74c3c" name={fighter1} />
                    <Bar dataKey="f2" fill="#3498db" name={fighter2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar chart */}
              <div className="col-md-6 mb-3">
                <h5 className="text-white text-center mb-3">Skill Radar</h5>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={getRadarData()}>
                    <PolarGrid stroke="#555" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#ccc', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar name={fighter1} dataKey={fighter1} stroke="#e74c3c" fill="#e74c3c" fillOpacity={0.3} />
                    <Radar name={fighter2} dataKey={fighter2} stroke="#3498db" fill="#3498db" fillOpacity={0.3} />
                    <Legend />
                    <Tooltip contentStyle={{ background: '#222', border: '1px solid #444' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weighted scorecard */}
            <div className="p-3" style={{ background: 'rgba(30,30,30,0.9)', borderRadius: '10px', border: '1px solid #444' }}>
              <h5 className="text-white text-center mb-3">Weighted MMA Scorecard</h5>

              {/* Score totals */}
              <div className="row text-center mb-3">
                <div className="col-5">
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c' }}>
                    {score1.toFixed(1)}
                  </div>
                  <div className="text-danger fw-bold" style={{ fontSize: '0.85rem' }}>{fighter1}</div>
                </div>
                <div className="col-2 d-flex align-items-center justify-content-center text-muted">vs</div>
                <div className="col-5">
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>
                    {score2.toFixed(1)}
                  </div>
                  <div className="text-primary fw-bold" style={{ fontSize: '0.85rem' }}>{fighter2}</div>
                </div>
              </div>

              {/* Category rows */}
              {rows.map(({ label, weight, winner, v1, v2, desc }) => (
                <div key={label} className="mb-2">
                  <div className="d-flex justify-content-between align-items-center"
                    style={{ fontSize: '0.82rem' }}>
                    <span style={{
                      color: winner === 1 ? '#e74c3c' : '#888',
                      fontWeight: winner === 1 ? 'bold' : 'normal',
                      minWidth: '55px'
                    }}>
                      {typeof v1 === 'number' ? v1.toFixed(2) : v1}
                      {winner === 1 && ' ✓'}
                    </span>
                    <div className="text-center" style={{ flex: 1 }}>
                      <span style={{ color: '#ddd' }}>{label}</span>
                      <span style={{ color: '#555', fontSize: '0.7rem' }}> ×{weight}</span>
                    </div>
                    <span style={{
                      color: winner === 2 ? '#3498db' : '#888',
                      fontWeight: winner === 2 ? 'bold' : 'normal',
                      minWidth: '55px',
                      textAlign: 'right'
                    }}>
                      {winner === 2 && '✓ '}
                      {typeof v2 === 'number' ? v2.toFixed(2) : v2}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: '4px', background: '#333', borderRadius: '2px', margin: '3px 0' }}>
                    <div style={{
                      height: '100%',
                      width: `${v1 + v2 > 0 ? (v1 / (v1 + v2)) * 100 : 50}%`,
                      background: 'linear-gradient(90deg, #e74c3c, #c0392b)',
                      borderRadius: '2px'
                    }} />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#555', textAlign: 'center' }}>{desc}</div>
                </div>
              ))}

              {/* Verdict */}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid #444' }}>
                <p className="text-center mb-0" style={{ fontSize: '0.95rem' }}>
                  {score1 > score2 ? (
                    <><span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{fighter1}</span> has the overall MMA edge based on weighted criteria.</>
                  ) : score2 > score1 ? (
                    <><span style={{ color: '#3498db', fontWeight: 'bold' }}>{fighter2}</span> has the overall MMA edge based on weighted criteria.</>
                  ) : (
                    <span style={{ color: '#aaa' }}>Too close to call — evenly matched across all criteria.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FighterComparison;
