// src/components/SearchBar.js
import React, { useState, useEffect } from 'react';
import { searchFighters } from '../services/api';

const SearchBar = ({ corner, onSelectFighter }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (term.length > 2) {
      searchFighters(term).then(res => {
        setResults(res.data);
        setShowResults(true);
      });
    } else {
      setShowResults(false);
    }
  }, [term]);

const handleSelect = (fighter) => {
  setShowResults(false);   // ✅ Just hide the dropdown
  onSelectFighter(fighter, corner); // ✅ Send selection to parent
};

  return (
    <div className="search-container mb-3">
      <input
        type="text"
        className="form-control form-control-lg"
        placeholder="Search fighter..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {showResults && (
        <div className="search-results">
          {results.map((fighter, index) => (
            <div
              key={index}
              className="search-item"
              onClick={() => handleSelect(fighter)}
            >
              {fighter}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
