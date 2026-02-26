import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { taskCategories, getCategoriesArray } from '../data/taskCategories';

export const TaskCategorySelect = ({ 
  value, 
  onChange, 
  onTaskTypeChange,
  selectedTaskType,
  customTaskText,
  onCustomTaskTextChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(value || null);
  const [showTaskTypes, setShowTaskTypes] = useState(false);

  const categories = getCategoriesArray();

  const handleCategorySelect = (categoryKey) => {
    setSelectedCategory(categoryKey);
    onChange(categoryKey);
    setShowTaskTypes(true);
  };

  const handleTaskTypeSelect = (taskType) => {
    onTaskTypeChange(taskType);
    setIsOpen(false);
    setShowTaskTypes(false);
  };

  const handleBack = () => {
    setShowTaskTypes(false);
    setSelectedCategory(null);
  };

  const selectedCategoryData = selectedCategory ? taskCategories[selectedCategory] : null;
  const isCustomTask = selectedTaskType === 'Custom Task (free text)';

  // Get display text for the button
  const getDisplayText = () => {
    if (selectedTaskType && selectedTaskType !== 'Custom Task (free text)') {
      return selectedTaskType;
    }
    if (isCustomTask && customTaskText) {
      return customTaskText;
    }
    if (selectedCategory) {
      return taskCategories[selectedCategory]?.label || 'Select task type';
    }
    return 'Select task category';
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 md:h-10 justify-between text-left font-normal"
      >
        <span className="truncate flex items-center gap-2">
          {selectedCategoryData && (
            <span>{selectedCategoryData.icon}</span>
          )}
          {getDisplayText()}
        </span>
        <ChevronRight className="h-4 w-4 opacity-50" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-white w-full md:w-[400px] max-h-[70vh] md:max-h-[500px] rounded-t-2xl md:rounded-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              {showTaskTypes ? (
                <>
                  <button 
                    onClick={handleBack}
                    className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    {selectedCategoryData?.icon} {selectedCategoryData?.label}
                  </h3>
                  <div className="w-7" /> {/* Spacer */}
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-slate-900">Select Task Category</h3>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[50vh] md:max-h-[400px]">
              {!showTaskTypes ? (
                // Category List
                <div className="py-2">
                  {categories.map(category => (
                    <button
                      key={category.key}
                      onClick={() => handleCategorySelect(category.key)}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${
                        selectedCategory === category.key ? 'bg-slate-100' : ''
                      }`}
                    >
                      <span className="text-xl">{category.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{category.label}</div>
                        <div className="text-xs text-slate-500">{category.tasks.length} tasks</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              ) : (
                // Task Types List
                <div className="py-2">
                  {selectedCategoryData?.tasks.map(taskType => (
                    <button
                      key={taskType}
                      onClick={() => handleTaskTypeSelect(taskType)}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${
                        selectedTaskType === taskType ? 'bg-teal-50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{taskType}</div>
                      </div>
                      {selectedTaskType === taskType && (
                        <Check className="h-4 w-4 text-teal-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom task text input */}
      {isCustomTask && (
        <div className="mt-2">
          <Input
            value={customTaskText || ''}
            onChange={(e) => onCustomTaskTextChange(e.target.value)}
            placeholder="Enter custom task description..."
            className="h-11 md:h-10"
          />
        </div>
      )}
    </div>
  );
};

// Inline TaskCategoryBadge for displaying in lists
export const TaskCategoryBadge = ({ category, taskType }) => {
  const categoryData = category ? taskCategories[category] : null;
  
  if (!categoryData) {
    // Fallback for tasks without category
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        📌 Other
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryData.bgClass} ${categoryData.textClass}`}>
      {categoryData.icon} {categoryData.label}
    </span>
  );
};

export default TaskCategorySelect;
