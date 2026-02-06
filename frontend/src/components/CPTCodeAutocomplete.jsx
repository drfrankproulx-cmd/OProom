import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Star, Search, Filter, Clock } from 'lucide-react';
import { CPT_CODES, searchCPTCodes, getFavoriteCPTCodes, getCPTCodesByCodes } from '../data/cptCodes';
import { getCPTCodesForDiagnosis } from '../data/diagnoses';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * CPT Code Autocomplete Component
 * Searchable dropdown with favorites system and diagnosis-based filtering
 */
export const CPTCodeAutocomplete = ({ value, onChange, label = "Procedure / CPT Code", required = false, diagnosis = null }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [selectedCPT, setSelectedCPT] = useState(null);
  const [frequentlyUsed, setFrequentlyUsed] = useState([]);
  const dropdownRef = useRef(null);

  // Load frequently used CPT codes on mount
  useEffect(() => {
    fetchFrequentlyUsed();
  }, []);

  useEffect(() => {
    // Get diagnosis-specific CPT codes if diagnosis is provided
    const diagnosisCodes = diagnosis ? getCPTCodesForDiagnosis(diagnosis) : null;

    if (!searchQuery) {
      // Priority: Diagnosis-specific > Frequently used > Favorites
      if (diagnosisCodes && diagnosisCodes.length > 0) {
        const relevantCodes = getCPTCodesByCodes(diagnosisCodes);
        setFilteredCodes(relevantCodes);
      } else if (frequentlyUsed.length > 0) {
        // Show frequently used codes
        setFilteredCodes(frequentlyUsed);
      } else {
        setFilteredCodes(getFavoriteCPTCodes());
      }
    } else {
      // Search within diagnosis-specific codes or all codes
      let searchResults = searchCPTCodes(searchQuery);

      // If diagnosis is provided, filter search results to only show relevant codes
      if (diagnosisCodes && diagnosisCodes.length > 0) {
        searchResults = searchResults.filter(cpt => diagnosisCodes.includes(cpt.code));
      }

      setFilteredCodes(searchResults.slice(0, 20)); // Limit to 20 results
    }
  }, [searchQuery, diagnosis, frequentlyUsed]);

  useEffect(() => {
    // Find selected CPT if value exists
    if (value) {
      const cpt = CPT_CODES.find(c => c.code === value);
      setSelectedCPT(cpt);
      if (cpt) {
        setSearchQuery(cpt.code);
      }
    }
  }, [value]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);
    if (!query) {
      setSelectedCPT(null);
      onChange('');
    }
  };

  const fetchFrequentlyUsed = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/usage/frequently-used-cpt?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Mark as frequently used
        const marked = data.map(cpt => ({ ...cpt, isFrequentlyUsed: true }));
        setFrequentlyUsed(marked);
      }
    } catch (error) {
      console.error('Failed to fetch frequently used CPT codes:', error);
    }
  };

  const handleSelectCPT = (cpt) => {
    setSelectedCPT(cpt);
    setSearchQuery(cpt.code);
    onChange(cpt.code);
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!searchQuery) {
      const diagnosisCodes = diagnosis ? getCPTCodesForDiagnosis(diagnosis) : null;
      if (diagnosisCodes && diagnosisCodes.length > 0) {
        const relevantCodes = getCPTCodesByCodes(diagnosisCodes);
        setFilteredCodes(relevantCodes);
      } else if (frequentlyUsed.length > 0) {
        setFilteredCodes(frequentlyUsed);
      } else {
        setFilteredCodes(getFavoriteCPTCodes());
      }
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Favorites': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'Orthognathic': 'text-green-600 bg-green-50 border-green-200',
      'Midface Fractures': 'text-red-600 bg-red-50 border-red-200',
      'Mandible Fractures': 'text-blue-600 bg-blue-50 border-blue-200',
      'Zygomatic Fractures': 'text-purple-600 bg-purple-50 border-purple-200',
      'Orbital Fractures': 'text-pink-600 bg-pink-50 border-pink-200',
      'TMJ': 'text-indigo-600 bg-indigo-50 border-indigo-200',
      'Reconstructive': 'text-orange-600 bg-orange-50 border-orange-200',
      'Nasal': 'text-teal-600 bg-teal-50 border-teal-200',
      'Soft Tissue': 'text-cyan-600 bg-cyan-50 border-cyan-200'
    };
    return colors[category] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label htmlFor="cpt-code">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="cpt-code"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder="Search CPT code or procedure (e.g., 'lefort', '21141')"
            className="pl-9"
            autoComplete="off"
          />
        </div>

        {/* Selected CPT Display */}
        {selectedCPT && !isOpen && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-mono font-semibold text-blue-700">{selectedCPT.code}</span>
                  {selectedCPT.isFavorite && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <p className="text-sm text-gray-700">{selectedCPT.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dropdown */}
        {isOpen && filteredCodes.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {/* Header for frequently used */}
            {!searchQuery && frequentlyUsed.length > 0 && !diagnosis && (
              <div className="px-3 py-1.5 bg-purple-50 border-b border-purple-200 sticky top-0">
                <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Frequently Used Procedures
                </span>
              </div>
            )}

            {filteredCodes.map((cpt, index) => (
              <button
                key={cpt.code}
                type="button"
                onClick={() => handleSelectCPT(cpt)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${index === filteredCodes.length - 1 ? 'rounded-b-lg' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono font-semibold text-blue-600 text-lg">
                        {cpt.code}
                      </span>
                      {cpt.isFrequentlyUsed && (
                        <Clock className="h-4 w-4 text-purple-500" />
                      )}
                      {cpt.isFavorite && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{cpt.description}</p>
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full border ${getCategoryColor(
                        cpt.category
                      )}`}
                    >
                      {cpt.category}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {isOpen && searchQuery && filteredCodes.length === 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <p className="text-gray-500 text-center">
              No CPT codes found for "{searchQuery}"
            </p>
          </div>
        )}

        {/* Diagnosis, Frequently Used, or Favorites hint */}
        {isOpen && !searchQuery && (() => {
          const diagnosisCodes = diagnosis ? getCPTCodesForDiagnosis(diagnosis) : null;
          const isDiagnosisFiltered = diagnosisCodes && diagnosisCodes.length > 0;
          const isFrequentlyUsed = !isDiagnosisFiltered && frequentlyUsed.length > 0;

          let bgColor = 'bg-white';
          let borderColor = 'border-gray-300';
          if (isDiagnosisFiltered) {
            bgColor = 'bg-blue-50';
            borderColor = 'border-blue-200';
          } else if (isFrequentlyUsed) {
            bgColor = 'bg-purple-50';
            borderColor = 'border-purple-200';
          }

          return (
            <div className={`absolute z-50 mt-1 w-full ${bgColor} border ${borderColor} rounded-t-lg border-b-0 px-4 py-2`}>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {isDiagnosisFiltered ? (
                  <>
                    <Filter className="h-3 w-3 text-blue-600" />
                    <span className="text-blue-700 font-medium">
                      Showing {filteredCodes.length} procedure(s) relevant to diagnosis - start typing to search
                    </span>
                  </>
                ) : isFrequentlyUsed ? (
                  <>
                    <Clock className="h-3 w-3 text-purple-600" />
                    <span className="text-purple-700 font-medium">
                      Showing your {filteredCodes.length} most used procedures - start typing to search
                    </span>
                  </>
                ) : (
                  <>
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span>Showing favorite procedures - start typing to search all codes</span>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default CPTCodeAutocomplete;
