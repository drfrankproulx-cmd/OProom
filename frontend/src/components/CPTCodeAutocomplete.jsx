import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Search, Clock, Sparkles, X, ChevronDown } from 'lucide-react';
import { loadCPTCodes, searchCPTCodes, getFavoriteCPTCodes, getRelevantCPTCodes, getCPTCodeByCode } from '../data/cptCodes';
import { getToken } from '../utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * CPT Code Autocomplete — Multi-select with category-grouped dropdown.
 */
export const CPTCodeAutocomplete = ({ value, onChange, label = "Procedure / CPT Code", required = false, diagnosis = null }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [selectedCPTs, setSelectedCPTs] = useState([]);
  const [frequentlyUsed, setFrequentlyUsed] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load CPT codes from backend on mount
  useEffect(() => {
    loadCPTCodes().then(() => setLoaded(true));
    fetchFrequentlyUsed();
  }, []);

  // Sync selectedCPTs from parent value
  useEffect(() => {
    if (!loaded) return;
    if (value) {
      const codes = value.split(',').map(c => c.trim()).filter(Boolean);
      // Use getCPTCodeByCode to find full code info (searches full 508 code list)
      const matched = codes.map(code => getCPTCodeByCode(code)).filter(Boolean);
      if (matched.length !== selectedCPTs.length || !matched.every((m, i) => selectedCPTs[i]?.code === m.code)) {
        setSelectedCPTs(matched);
      }
    } else if (selectedCPTs.length > 0) {
      setSelectedCPTs([]);
    }
  }, [value, loaded]);

  // Update filtered codes when search or diagnosis changes
  useEffect(() => {
    if (!loaded) return;
    if (!searchQuery) {
      if (diagnosis && getRelevantCPTCodes(diagnosis).length > 0) {
        setFilteredCodes(searchCPTCodes('', diagnosis));
      } else if (frequentlyUsed.length > 0) {
        setFilteredCodes(frequentlyUsed);
      } else {
        setFilteredCodes(getFavoriteCPTCodes());
      }
    } else {
      setFilteredCodes(searchCPTCodes(searchQuery, diagnosis));
    }
  }, [searchQuery, diagnosis, frequentlyUsed, loaded]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFrequentlyUsed = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/usage/frequently-used-cpt?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFrequentlyUsed(data.map(cpt => ({ ...cpt, isFrequentlyUsed: true })));
      }
    } catch (e) { /* ignore */ }
  };

  const emitChange = useCallback((cpts) => {
    const codes = cpts.map(c => c.code).join(', ');
    const descs = cpts.map(c => c.common_name || c.description).join('; ');
    onChange(codes, descs);
  }, [onChange]);

  const handleSelectCPT = (cpt) => {
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

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && !searchQuery && selectedCPTs.length > 0) {
      handleRemoveCPT(selectedCPTs[selectedCPTs.length - 1].code);
    }
  };

  // Filter out already-selected, group by category
  const availableCodes = filteredCodes.filter(c => !selectedCPTs.some(s => s.code === c.code));
  const grouped = {};
  for (const c of availableCodes) {
    const cat = c.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  }

  const CATEGORY_COLORS = {
    'Dentoalveolar Surgery': 'text-amber-700 bg-amber-50',
    'Orthognathic Surgery': 'text-green-700 bg-green-50',
    'Reconstruction & Free Flaps': 'text-orange-700 bg-orange-50',
    'Oncology & Ablative': 'text-red-700 bg-red-50',
    'Pathology': 'text-slate-700 bg-slate-50',
    'TMJ': 'text-indigo-700 bg-indigo-50',
    'Odontogenic Infections': 'text-rose-700 bg-rose-50',
    'Trauma': 'text-blue-700 bg-blue-50',
    'Complex Case & Supportive': 'text-purple-700 bg-purple-50',
    'Implants & Preprosthetic': 'text-lime-700 bg-lime-50',
    'Cleft & Craniofacial': 'text-cyan-700 bg-cyan-50',
    'Miscellaneous': 'text-gray-700 bg-gray-50',
  };

  return (
    <div className="space-y-1 md:space-y-2" ref={dropdownRef}>
      <Label htmlFor="cpt-code" className="text-xs md:text-sm">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        {/* Tags + Input container */}
        <div
          className={`flex flex-wrap items-center gap-1.5 min-h-[44px] md:min-h-[40px] px-3 py-1.5 border rounded-lg bg-white transition-colors cursor-text ${
            isOpen ? 'border-teal-500 ring-1 ring-teal-200' : 'border-slate-200'
          }`}
          onClick={() => inputRef.current?.focus()}
        >
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
          <div className="flex-1 min-w-[120px] relative">
            {selectedCPTs.length === 0 && !searchQuery && (
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            )}
            <input
              ref={inputRef}
              id="cpt-code"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={selectedCPTs.length > 0 ? "Add another..." : "Search CPT code or procedure..."}
              className={`w-full bg-transparent border-none outline-none text-sm h-7 ${
                selectedCPTs.length === 0 && !searchQuery ? 'pl-6' : 'pl-0'
              }`}
              autoComplete="off"
              data-testid="cpt-autocomplete-input"
            />
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Selected CPTs detail (when closed) */}
        {selectedCPTs.length > 0 && !isOpen && (
          <div className="mt-1.5 space-y-1">
            {selectedCPTs.map(cpt => (
              <div key={cpt.code} className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-md text-xs text-slate-600">
                <span className="font-mono font-semibold text-teal-700">{cpt.code}</span>
                <span className="truncate">{cpt.common_name || cpt.description}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[cpt.category] || 'text-gray-600 bg-gray-50'}`}>
                  {cpt.category}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown */}
        {isOpen && (Object.keys(grouped).length > 0 || searchQuery) && (
          <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-[50vh] md:max-h-96 overflow-y-auto">
            {/* Header hint */}
            {!searchQuery && diagnosis && getRelevantCPTCodes(diagnosis).length > 0 && (
              <div className="px-3 py-1.5 bg-teal-50 border-b border-teal-200 sticky top-0 z-10">
                <span className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Recommended for "{diagnosis}"
                </span>
              </div>
            )}
            {!searchQuery && !diagnosis && frequentlyUsed.length > 0 && (
              <div className="px-3 py-1.5 bg-purple-50 border-b border-purple-200 sticky top-0 z-10">
                <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Frequently Used
                </span>
              </div>
            )}

            {/* Free-text "Other" option when searching */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  const customCPT = { code: searchQuery, common_name: searchQuery, description: searchQuery, category: 'Custom' };
                  handleSelectCPT(customCPT);
                }}
                className="w-full text-left px-3 md:px-4 py-2.5 hover:bg-teal-50 active:bg-teal-100 border-b border-gray-200 transition-colors bg-slate-50"
                data-testid="cpt-use-custom"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Other</span>
                  <span className="text-sm font-medium text-slate-800">Use "{searchQuery}" as entered</span>
                </div>
              </button>
            )}

            {Object.entries(grouped).map(([catName, codes]) => (
              <div key={catName}>
                {/* Category header */}
                <div className={`px-3 py-1.5 border-b border-gray-100 sticky top-0 z-[5] ${CATEGORY_COLORS[catName] || 'text-gray-700 bg-gray-50'}`}>
                  <span className="text-xs font-bold uppercase tracking-wide">{catName}</span>
                </div>
                {codes.map(cpt => (
                  <button
                    key={cpt.code}
                    type="button"
                    onClick={() => handleSelectCPT(cpt)}
                    className="w-full text-left px-3 md:px-4 py-2.5 hover:bg-blue-50 active:bg-blue-100 border-b border-gray-50 last:border-b-0 transition-colors"
                    data-testid={`cpt-option-${cpt.code}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-blue-600 text-sm min-w-[52px]">{cpt.code}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{cpt.common_name || cpt.description}</p>
                        {cpt.common_name && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{cpt.description}</p>
                        )}
                      </div>
                      {cpt.subcategory && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap self-center">
                          {cpt.subcategory}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* No results — offer free text */}
        {isOpen && searchQuery && Object.keys(grouped).length === 0 && (
          <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
            <button
              type="button"
              onClick={() => {
                const customCPT = { code: searchQuery, common_name: searchQuery, description: searchQuery, category: 'Custom' };
                handleSelectCPT(customCPT);
              }}
              className="w-full text-left px-3 md:px-4 py-2.5 hover:bg-teal-50 active:bg-teal-100 transition-colors rounded-t-lg"
              data-testid="cpt-use-custom-noresults"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Other</span>
                <span className="text-sm font-medium text-slate-800">Use "{searchQuery}" as entered</span>
              </div>
            </button>
            <p className="text-gray-400 text-center text-xs py-2 border-t border-gray-100">
              No matching CPT codes found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CPTCodeAutocomplete;
