import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Star, Search, Clock, Sparkles, X } from 'lucide-react';
import { CPT_CODES, searchCPTCodes, getFavoriteCPTCodes, getRelevantCPTCodes } from '../data/cptCodes';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * CPT Code Autocomplete Component - Multi-select
 * Searchable dropdown with favorites system, diagnosis-based filtering,
 * and support for selecting multiple CPT codes displayed as removable tags.
 */
export const CPTCodeAutocomplete = ({ value, onChange, label = "Procedure / CPT Code", required = false, diagnosis = null }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [selectedCPTs, setSelectedCPTs] = useState([]);
  const [frequentlyUsed, setFrequentlyUsed] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load frequently used CPT codes on mount
  useEffect(() => {
    fetchFrequentlyUsed();
  }, []);

  // Sync selected CPTs from parent value (comma-separated codes string)
  useEffect(() => {
    if (value) {
      const codes = value.split(',').map(c => c.trim()).filter(Boolean);
      const matched = codes.map(code => CPT_CODES.find(c => c.code === code)).filter(Boolean);
      if (matched.length !== selectedCPTs.length || !matched.every((m, i) => selectedCPTs[i]?.code === m.code)) {
        setSelectedCPTs(matched);
      }
    } else if (selectedCPTs.length > 0) {
      setSelectedCPTs([]);
    }
  }, [value]);

  useEffect(() => {
    const relevantCodes = diagnosis ? getRelevantCPTCodes(diagnosis) : null;
    const hasRelevantCodes = relevantCodes && relevantCodes.length > 0;

    if (!searchQuery) {
      if (hasRelevantCodes) {
        const sortedCodes = searchCPTCodes('', diagnosis);
        setFilteredCodes(sortedCodes.slice(0, 20));
      } else if (frequentlyUsed.length > 0) {
        setFilteredCodes(frequentlyUsed);
      } else {
        setFilteredCodes(getFavoriteCPTCodes());
      }
    } else {
      const searchResults = searchCPTCodes(searchQuery, diagnosis);
      setFilteredCodes(searchResults.slice(0, 20));
    }
  }, [searchQuery, diagnosis, frequentlyUsed]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const fetchFrequentlyUsed = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/api/usage/frequently-used-cpt?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFrequentlyUsed(data.map(cpt => ({ ...cpt, isFrequentlyUsed: true })));
      }
    } catch (error) {
      console.error('Failed to fetch frequently used CPT codes:', error);
    }
  };

  const emitChange = (cpts) => {
    const codes = cpts.map(c => c.code).join(', ');
    const descriptions = cpts.map(c => c.description).join('; ');
    onChange(codes, descriptions);
  };

  const handleSelectCPT = (cpt) => {
    // Don't add duplicates
    if (selectedCPTs.some(s => s.code === cpt.code)) return;
    const updated = [...selectedCPTs, cpt];
    setSelectedCPTs(updated);
    emitChange(updated);
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleRemoveCPT = (code) => {
    const updated = selectedCPTs.filter(c => c.code !== code);
    setSelectedCPTs(updated);
    emitChange(updated);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!searchQuery) {
      const relevantCodes = diagnosis ? getRelevantCPTCodes(diagnosis) : null;
      const hasRelevantCodes = relevantCodes && relevantCodes.length > 0;
      if (hasRelevantCodes) {
        setFilteredCodes(searchCPTCodes('', diagnosis).slice(0, 20));
      } else if (frequentlyUsed.length > 0) {
        setFilteredCodes(frequentlyUsed);
      } else {
        setFilteredCodes(getFavoriteCPTCodes());
      }
    }
  };

  const handleKeyDown = (e) => {
    // Backspace with empty search removes last tag
    if (e.key === 'Backspace' && !searchQuery && selectedCPTs.length > 0) {
      handleRemoveCPT(selectedCPTs[selectedCPTs.length - 1].code);
    }
  };

  // Filter out already-selected codes from dropdown
  const availableCodes = filteredCodes.filter(c => !selectedCPTs.some(s => s.code === c.code));

  const getCategoryColor = (category) => {
    const colors = {
      'Favorites': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'Biopsy': 'text-amber-600 bg-amber-50 border-amber-200',
      'Ablation': 'text-red-600 bg-red-50 border-red-200',
      'Reconstruction': 'text-orange-600 bg-orange-50 border-orange-200',
      'Diagnostic': 'text-slate-600 bg-slate-50 border-slate-200',
      'Revision': 'text-gray-600 bg-gray-50 border-gray-200',
      'Odontogenic Infections': 'text-rose-600 bg-rose-50 border-rose-200',
      'Mandible Fractures': 'text-blue-600 bg-blue-50 border-blue-200',
      'Midface Fractures': 'text-violet-600 bg-violet-50 border-violet-200',
      'Bone Graft': 'text-lime-600 bg-lime-50 border-lime-200',
      'Laceration': 'text-pink-600 bg-pink-50 border-pink-200',
      'Orthognathic': 'text-green-600 bg-green-50 border-green-200',
      'Genioplasty': 'text-emerald-600 bg-emerald-50 border-emerald-200',
      'TMJ': 'text-indigo-600 bg-indigo-50 border-indigo-200',
      'Cosmetic': 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200',
      'Nasal Fractures': 'text-teal-600 bg-teal-50 border-teal-200',
      'Cleft': 'text-cyan-600 bg-cyan-50 border-cyan-200',
    };
    return colors[category] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-1 md:space-y-2" ref={dropdownRef}>
      <Label htmlFor="cpt-code" className="text-xs md:text-sm">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        {/* Tags + Input container */}
        <div
          className={`flex flex-wrap items-center gap-1.5 min-h-[44px] md:min-h-[40px] px-3 py-1.5 border rounded-lg bg-white transition-colors ${
            isOpen ? 'border-teal-500 ring-1 ring-teal-200' : 'border-slate-200'
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Selected CPT tags */}
          {selectedCPTs.map(cpt => (
            <Badge
              key={cpt.code}
              className="bg-teal-100 text-teal-800 pl-2 pr-1 py-1 text-xs font-medium rounded-md flex items-center gap-1 whitespace-nowrap"
            >
              <span className="font-mono font-semibold">{cpt.code}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemoveCPT(cpt.code); }}
                className="ml-0.5 p-0.5 rounded hover:bg-teal-200 transition-colors"
                data-testid={`remove-cpt-${cpt.code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* Search input */}
          <div className="flex-1 min-w-[120px] relative">
            {selectedCPTs.length === 0 && !searchQuery && (
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            )}
            <input
              ref={inputRef}
              id="cpt-code"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={selectedCPTs.length > 0 ? "Add another..." : "Search CPT code or procedure..."}
              className={`w-full bg-transparent border-none outline-none text-sm h-7 ${
                selectedCPTs.length === 0 && !searchQuery ? 'pl-6' : 'pl-0'
              }`}
              autoComplete="off"
              data-testid="cpt-autocomplete-input"
            />
          </div>
        </div>

        {/* Selected CPTs detail (when closed, show descriptions) */}
        {selectedCPTs.length > 0 && !isOpen && (
          <div className="mt-1.5 space-y-1">
            {selectedCPTs.map(cpt => (
              <div key={cpt.code} className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-md text-xs text-slate-600">
                <span className="font-mono font-semibold text-teal-700">{cpt.code}</span>
                <span className="truncate">{cpt.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown */}
        {isOpen && availableCodes.length > 0 && (
          <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-[50vh] md:max-h-96 overflow-y-auto">
            {!searchQuery && frequentlyUsed.length > 0 && !diagnosis && (
              <div className="px-3 py-1.5 bg-purple-50 border-b border-purple-200 sticky top-0">
                <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Frequently Used Procedures
                </span>
              </div>
            )}

            {!searchQuery && diagnosis && getRelevantCPTCodes(diagnosis)?.length > 0 && (
              <div className="px-3 py-1.5 bg-teal-50 border-b border-teal-200 sticky top-0">
                <span className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Recommended for diagnosis
                </span>
              </div>
            )}

            {availableCodes.map((cpt, index) => {
              const relevantCodes = diagnosis ? getRelevantCPTCodes(diagnosis) : null;
              const isRelevant = relevantCodes && relevantCodes.includes(cpt.code);
              
              return (
                <button
                  key={cpt.code}
                  type="button"
                  onClick={() => handleSelectCPT(cpt)}
                  className={`w-full text-left px-3 md:px-4 py-3 hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-b-0 transition-colors ${
                    isRelevant ? 'bg-teal-50/50' : ''
                  }`}
                  data-testid={`cpt-option-${cpt.code}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                        <span className="font-mono font-semibold text-blue-600 text-base md:text-lg">
                          {cpt.code}
                        </span>
                        {isRelevant && <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-teal-500 flex-shrink-0" />}
                        {cpt.isFrequentlyUsed && <Clock className="h-3 w-3 md:h-4 md:w-4 text-purple-500 flex-shrink-0" />}
                        {cpt.isFavorite && !isRelevant && <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs md:text-sm text-gray-700 mb-1 md:mb-2 line-clamp-2">{cpt.description}</p>
                      <span className={`inline-block text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full border ${getCategoryColor(cpt.category)}`}>
                        {cpt.category}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* No results */}
        {isOpen && searchQuery && availableCodes.length === 0 && (
          <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <p className="text-gray-500 text-center text-sm">
              No CPT codes found for "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CPTCodeAutocomplete;
