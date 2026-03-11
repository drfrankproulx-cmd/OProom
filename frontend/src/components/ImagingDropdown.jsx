import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Image as ImageIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const IMAGING_OPTIONS = [
  "CT Facial (Maxillofacial)",
  "CT Abd/Leg Run-Off (Fibula Free Flap Planning)",
  "PET Scan",
  "OPG (Orthopantomogram / Panorex)",
  "Lateral Cephalometric"
];

// Short labels for display
const getShortLabel = (option) => {
  const shortLabels = {
    "CT Facial (Maxillofacial)": "CT Facial",
    "CT Abd/Leg Run-Off (Fibula Free Flap Planning)": "CT Abd/Leg",
    "PET Scan": "PET Scan",
    "OPG (Orthopantomogram / Panorex)": "OPG",
    "Lateral Cephalometric": "Lat Ceph"
  };
  return shortLabels[option] || option;
};

export const ImagingDropdown = ({ selection = [], onSelectionChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelection, setLocalSelection] = useState(selection);
  const dropdownRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    setLocalSelection(selection);
  }, [selection]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleOption = (option) => {
    const newSelection = localSelection.includes(option)
      ? localSelection.filter(s => s !== option)
      : [...localSelection, option];
    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  const clearAll = (e) => {
    e.stopPropagation();
    setLocalSelection([]);
    onSelectionChange([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors ${
          isOpen ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <ImageIcon className="h-4 w-4 text-teal-600 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-700">Imaging:</span>
        
        {localSelection.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
            {localSelection.map(option => (
              <Badge 
                key={option}
                className="bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap"
              >
                {getShortLabel(option)}
              </Badge>
            ))}
            <button
              onClick={clearAll}
              className="ml-1 p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-slate-400 flex-1">Select studies...</span>
        )}
        
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Panel - Desktop */}
      {isOpen && !isMobile && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Imaging Studies</span>
          </div>
          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {IMAGING_OPTIONS.map(option => (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  localSelection.includes(option) 
                    ? 'bg-teal-50 border border-teal-200' 
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  localSelection.includes(option) 
                    ? 'bg-teal-500 border-teal-500' 
                    : 'border-slate-300'
                }`}>
                  {localSelection.includes(option) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={`text-sm ${localSelection.includes(option) ? 'font-medium text-teal-700' : 'text-slate-700'}`}>
                  {option}
                </span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-end">
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="bg-teal-500 hover:bg-teal-600 text-white text-xs h-8"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Sheet - Mobile */}
      {isOpen && isMobile && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Select Imaging Studies</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
              {IMAGING_OPTIONS.map(option => (
                <div
                  key={option}
                  onClick={() => toggleOption(option)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors touch-manipulation ${
                    localSelection.includes(option) 
                      ? 'bg-teal-50 border-2 border-teal-500' 
                      : 'bg-slate-50 border-2 border-transparent'
                  }`}
                  style={{ minHeight: '56px' }}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    localSelection.includes(option) 
                      ? 'bg-teal-500 border-teal-500' 
                      : 'border-slate-300 bg-white'
                  }`}>
                    {localSelection.includes(option) && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <span className={`text-base ${localSelection.includes(option) ? 'font-medium text-teal-700' : 'text-slate-700'}`}>
                    {option}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white font-medium text-base rounded-xl"
              >
                Done ({localSelection.length} selected)
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ImagingDropdown;
