'use client';

import { useState } from 'react';
import { FilterOptions, JobPosting } from '@/lib/types';
import { Search, Filter, X } from 'lucide-react';

interface JobFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableLocations: string[];
  availableCompanies: string[];
  availableSources: string[];
}

export default function JobFilters({
  filters,
  onFiltersChange,
  availableLocations,
  availableCompanies,
  availableSources,
}: JobFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchTerm;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search jobs by title, company, or keywords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posted Date
            </label>
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  const newFilters = { ...filters };
                  delete newFilters.dateRange;
                  onFiltersChange(newFilters);
                } else {
                  const days = parseInt(value);
                  const start = new Date();
                  start.setDate(start.getDate() - days);
                  handleFilterChange('dateRange', {
                    start,
                    end: new Date(),
                  });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="3">Last 3 days</option>
              <option value="7">Last week</option>
              <option value="30">Last month</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select
              multiple
              value={filters.locations || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleFilterChange('locations', selected.length > 0 ? selected : undefined);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              size={4}
            >
              {availableLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <select
              multiple
              value={filters.companies || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleFilterChange('companies', selected.length > 0 ? selected : undefined);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              size={4}
            >
              {availableCompanies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salary Range
            </label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Min salary"
                value={filters.salaryRange?.min || ''}
                onChange={(e) => {
                  const min = e.target.value ? parseInt(e.target.value) : undefined;
                  handleFilterChange('salaryRange', {
                    ...filters.salaryRange,
                    min,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max salary"
                value={filters.salaryRange?.max || ''}
                onChange={(e) => {
                  const max = e.target.value ? parseInt(e.target.value) : undefined;
                  handleFilterChange('salaryRange', {
                    ...filters.salaryRange,
                    max,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="space-y-2">
              {(['new', 'viewed', 'applied', 'dismissed'] as JobPosting['status'][]).map((status) => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(status) || false}
                    onChange={(e) => {
                      const currentStatus = filters.status || [];
                      if (e.target.checked) {
                        handleFilterChange('status', [...currentStatus, status]);
                      } else {
                        const newStatus = currentStatus.filter(s => s !== status);
                        handleFilterChange('status', newStatus.length > 0 ? newStatus : undefined);
                      }
                    }}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source
            </label>
            <select
              multiple
              value={filters.sources || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleFilterChange('sources', selected.length > 0 ? selected : undefined);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              size={4}
            >
              {availableSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}