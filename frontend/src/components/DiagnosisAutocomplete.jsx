import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Clock, Search } from 'lucide-react';
import { DIAGNOSES, searchDiagnoses } from '../data/diagnoses';

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
      const token = localStorage.getItem('token');
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
      console.error('Failed to fetch frequently used diagnoses:', error);
    }
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onChange(query);
    setIsOpen(true);
  };

  const handleSelectDiagnosis = (diagnosis) => {
    const diagnosisName = diagnosis.name || diagnosis;
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
      'Mandible Fractures': 'text-blue-600 bg-blue-50 border-blue-200',
      'Midface Fractures': 'text-red-600 bg-red-50 border-red-200',
      'Zygomatic Fractures': 'text-purple-600 bg-purple-50 border-purple-200',
      'Orbital Fractures': 'text-pink-600 bg-pink-50 border-pink-200',
      'Nasal Fractures': 'text-teal-600 bg-teal-50 border-teal-200',
      'Orthognathic': 'text-green-600 bg-green-50 border-green-200',
      'TMJ': 'text-indigo-600 bg-indigo-50 border-indigo-200',
      'Reconstructive': 'text-orange-600 bg-orange-50 border-orange-200',
      'Soft Tissue': 'text-cyan-600 bg-cyan-50 border-cyan-200',
    };
    return colors[category] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label htmlFor="diagnosis">
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
            placeholder="Search diagnosis (e.g., 'mandible fracture', 'lefort')"
            className="pl-9"
            autoComplete="off"
          />
        </div>

        {/* Dropdown */}
        {isOpen && filteredDiagnoses.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {/* Header for frequently used */}
            {!searchQuery && frequentlyUsed.length > 0 && (
              <div className="px-3 py-1.5 bg-purple-50 border-b border-purple-200 sticky top-0">
                <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Frequently Used
                </span>
              </div>
            )}

            {filteredDiagnoses.map((diagnosis, index) => (
              <button
                key={`${diagnosis.id || diagnosis.name}-${index}`}
                type="button"
                onClick={() => handleSelectDiagnosis(diagnosis)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${index === filteredDiagnoses.length - 1 ? 'rounded-b-lg' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {diagnosis.category === 'Frequently Used' && (
                        <Clock className="h-3 w-3 text-purple-500" />
                      )}
                      <span className="font-medium text-gray-900 text-sm">
                        {diagnosis.name}
                      </span>
                    </div>
                    {diagnosis.category && (
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-full border ${getCategoryColor(
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

        {/* No results message */}
        {isOpen && searchQuery && filteredDiagnoses.length === 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <p className="text-gray-500 text-center">
              No diagnoses found for "{searchQuery}"
            </p>
          </div>
        )}

        {/* Hint */}
        {isOpen && !searchQuery && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-t-lg border-b-0 px-4 py-2">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              {frequentlyUsed.length > 0 ? (
                <>
                  <Clock className="h-3 w-3 text-purple-500" />
                  <span className="text-purple-700 font-medium">
                    Showing your {filteredDiagnoses.length} most used diagnoses - start typing to search
                  </span>
                </>
              ) : (
                <>
                  <Search className="h-3 w-3" />
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
