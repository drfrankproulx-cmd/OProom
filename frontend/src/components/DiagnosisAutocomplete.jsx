import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Clock, Search } from 'lucide-react';
import { DIAGNOSES, searchDiagnoses } from '../data/diagnoses';
import { getToken } from '../utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * Diagnosis Autocomplete Component
 * Searchable dropdown with frequently used diagnoses
 */
export const DiagnosisAutocomplete = ({ value, onChange, label = "Diagnosis", required = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredDiagnoses, setFilteredDiagnoses] = useState([]);
  const [frequentlyUsed, setFrequentlyUsed] = useState([]);
  const dropdownRef = useRef(null);

  // Load frequently used diagnoses on mount
  useEffect(() => {
    fetchFrequentlyUsed();
  }, []);

  // Update search results when query or frequently used changes
  useEffect(() => {
    if (!searchQuery) {
      // Show frequently used diagnoses when no search query
      if (frequentlyUsed.length > 0) {
        setFilteredDiagnoses(frequentlyUsed.slice(0, 10));
      } else {
        // Show common diagnoses from our database
        setFilteredDiagnoses(DIAGNOSES.slice(0, 15));
      }
    } else {
      // Search through all diagnoses
      const results = searchDiagnoses(searchQuery);
      setFilteredDiagnoses(results.slice(0, 15));
    }
  }, [searchQuery, frequentlyUsed]);

  // Set initial value
  useEffect(() => {
    if (value) {
      setSearchQuery(value);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFrequentlyUsed = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/usage/frequently-used-diagnoses?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Convert to diagnosis objects with name property
        const diagnosisObjects = data.map(item => ({
          name: item.diagnosis,
          category: 'Frequently Used'
        }));
        setFrequentlyUsed(diagnosisObjects);
      }
    } catch (error) {
    }
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onChange(query);
    setIsOpen(true);
  };

  const handleSelectDiagnosis = (diagnosis) => {
    // If diagnosis has an ICD code, include it in the display
    const diagnosisName = diagnosis.icdCode 
      ? `${diagnosis.name} (${diagnosis.icdCode})`
      : (diagnosis.name || diagnosis);
    setSearchQuery(diagnosisName);
    onChange(diagnosisName);
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Frequently Used': 'text-purple-600 bg-purple-50 border-purple-200',
      'Trauma': 'text-red-600 bg-red-50 border-red-200',
      'H&N Oncology': 'text-rose-600 bg-rose-50 border-rose-200',
      'TMJ': 'text-indigo-600 bg-indigo-50 border-indigo-200',
      'Orthognathic': 'text-green-600 bg-green-50 border-green-200',
      'Cleft & Craniofacial': 'text-amber-600 bg-amber-50 border-amber-200',
      'Cosmetics': 'text-pink-600 bg-pink-50 border-pink-200',
      'Mandible Fractures': 'text-blue-600 bg-blue-50 border-blue-200',
      'Midface Fractures': 'text-red-600 bg-red-50 border-red-200',
      'Zygomatic Fractures': 'text-purple-600 bg-purple-50 border-purple-200',
      'Orbital Fractures': 'text-pink-600 bg-pink-50 border-pink-200',
      'Nasal Fractures': 'text-teal-600 bg-teal-50 border-teal-200',
      'Reconstructive': 'text-orange-600 bg-orange-50 border-orange-200',
      'Soft Tissue': 'text-cyan-600 bg-cyan-50 border-cyan-200',
      'Dental Implants': 'text-emerald-600 bg-emerald-50 border-emerald-200',
    };
    return colors[category] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-1 md:space-y-2" ref={dropdownRef}>
      <Label htmlFor="diagnosis" className="text-xs md:text-sm">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="diagnosis"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder="Search diagnosis..."
            className="pl-9 h-11 md:h-10 text-base md:text-sm"
            autoComplete="off"
            data-testid="diagnosis-autocomplete-input"
          />
        </div>

        {/* Dropdown */}
        {isOpen && filteredDiagnoses.length > 0 && (
          <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-[50vh] md:max-h-96 overflow-y-auto">
            {/* Always-visible "Other" free text option */}
            <button
              type="button"
              onClick={() => {
                const customText = searchQuery || '';
                if (customText) {
                  handleSelectDiagnosis({ name: customText });
                } else {
                  setIsOpen(true);
                  document.getElementById('diagnosis')?.focus();
                }
              }}
              className="w-full text-left px-3 md:px-4 py-2.5 hover:bg-teal-50 active:bg-teal-100 border-b border-gray-200 transition-colors bg-slate-50 sticky top-0 z-10"
              data-testid="diagnosis-other-option"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Other</span>
                <span className="text-sm text-slate-600">
                  {searchQuery ? `Use "${searchQuery}" as entered` : 'Type a custom diagnosis above'}
                </span>
              </div>
            </button>

            {/* Header for frequently used */}
            {!searchQuery && frequentlyUsed.length > 0 && (
              <div className="px-3 py-1.5 bg-purple-50 border-b border-purple-200 sticky top-0">
                <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Frequently Used
                </span>
              </div>
            )}

            {/* Use as custom option when searching */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSelectDiagnosis({ name: searchQuery })}
                className="w-full text-left px-3 md:px-4 py-3 hover:bg-teal-50 active:bg-teal-100 border-b border-gray-200 transition-colors bg-slate-50"
                data-testid="diagnosis-use-custom"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Other</span>
                  <span className="text-sm font-medium text-slate-800">Use "{searchQuery}" as entered</span>
                </div>
              </button>
            )}

            {filteredDiagnoses.map((diagnosis, index) => (
              <button
                key={`${diagnosis.id || diagnosis.name}-${index}`}
                type="button"
                onClick={() => handleSelectDiagnosis(diagnosis)}
                title={`${diagnosis.name}${diagnosis.icdCode ? ' (' + diagnosis.icdCode + ')' : ''}`}
                className={`w-full text-left px-3 md:px-4 py-3 md:py-3 hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-b-0 transition-colors ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${index === filteredDiagnoses.length - 1 ? 'rounded-b-lg' : ''}`}
                data-testid={`diagnosis-option-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {diagnosis.category === 'Frequently Used' && (
                        <Clock className="h-3 w-3 text-purple-500 flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-900 text-sm">
                        {diagnosis.name}
                      </span>
                      {diagnosis.icdCode && (
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">
                          {diagnosis.icdCode}
                        </span>
                      )}
                    </div>
                    {diagnosis.category && (
                      <span
                        className={`inline-block text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full border ${getCategoryColor(
                          diagnosis.category
                        )}`}
                      >
                        {diagnosis.category}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message — offer free text */}
        {isOpen && searchQuery && filteredDiagnoses.length === 0 && (
          <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
            <button
              type="button"
              onClick={() => handleSelectDiagnosis({ name: searchQuery })}
              className="w-full text-left px-3 md:px-4 py-3 hover:bg-teal-50 active:bg-teal-100 transition-colors rounded-t-lg"
              data-testid="diagnosis-use-custom-noresults"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Other</span>
                <span className="text-sm font-medium text-slate-800">Use "{searchQuery}" as entered</span>
              </div>
            </button>
            <p className="text-gray-400 text-center text-xs py-2 border-t border-gray-100">
              No matching diagnoses found
            </p>
          </div>
        )}

        {/* Hint */}
        {isOpen && !searchQuery && (
          <div className="absolute z-[9998] mt-1 w-full bg-white border border-gray-300 rounded-t-lg border-b-0 px-3 md:px-4 py-2">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              {frequentlyUsed.length > 0 ? (
                <>
                  <Clock className="h-3 w-3 text-purple-500 flex-shrink-0" />
                  <span className="text-purple-700 font-medium">
                    Most used - start typing to search
                  </span>
                </>
              ) : (
                <>
                  <Search className="h-3 w-3 flex-shrink-0" />
                  <span>Common diagnoses - start typing to search</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisAutocomplete;
