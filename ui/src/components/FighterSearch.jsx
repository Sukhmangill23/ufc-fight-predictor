import React, { useState } from 'react';
import axios from 'axios';

const FighterSearch = ({ corner, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);

    const handleSearch = async (event) => {
        const term = event.target.value;
        setSearchTerm(term);
        if (term.length > 2) {
            const response = await axios.get('/search_fighters', { params: { term } });
            setResults(response.data);
        } else {
            setResults([]);
        }
    };

    const handleSelect = (fighter) => {
        onSelect(fighter);
        setSearchTerm(fighter);
        setResults([]);
    };

    return (
        <div className={`fighter-card ${corner}`}>
            <h3>{corner === 'red-corner' ? 'RED CORNER' : 'BLUE CORNER'}</h3>
            <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search fighter..."
            />
            <div className="search-results">
                {results.map((fighter) => (
                    <div key={fighter} onClick={() => handleSelect(fighter)}>
                        {fighter}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FighterSearch;
