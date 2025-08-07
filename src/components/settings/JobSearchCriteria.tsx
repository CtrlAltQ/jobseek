'use client';

import React, { useState } from 'react';
import { UserSettings } from '@/lib/types';

interface JobSearchCriteriaProps {
  searchCriteria: UserSettings['searchCriteria'];
  onChange: (searchCriteria: UserSettings['searchCriteria']) => void;
}

const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Media & Entertainment',
  'Government',
  'Non-profit',
  'Real Estate',
  'Transportation',
  'Energy',
  'Agriculture',
  'Other'
];

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'mid', label: 'Mid Level (3-5 years)' },
  { value: 'senior', label: 'Senior Level (6-10 years)' },
  { value: 'executive', label: 'Executive Level (10+ years)' }
] as const;

export default function JobSearchCriteria({ searchCriteria, onChange }: JobSearchCriteriaProps) {
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const handleArrayAdd = (field: 'jobTitles' | 'keywords' | 'locations', value: string) => {
    if (value.trim() && !searchCriteria[field].includes(value.trim())) {
      onChange({
        ...searchCriteria,
        [field]: [...searchCriteria[field], value.trim()]
      });
    }
  };

  const handleArrayRemove = (field: 'jobTitles' | 'keywords' | 'locations', index: number) => {
    onChange({
      ...searchCriteria,
      [field]: searchCriteria[field].filter((_, i) => i !== index)
    });
  };

  const handleSalaryChange = (field: 'min' | 'max', value: number) => {
    onChange({
      ...searchCriteria,
      salaryRange: {
        ...searchCriteria.salaryRange,
        [field]: value
      }
    });
  };

  const handleIndustryToggle = (industry: string) => {
    const isSelected = searchCriteria.industries.includes(industry);
    onChange({
      ...searchCriteria,
      industries: isSelected
        ? searchCriteria.industries.filter(i => i !== industry)
        : [...searchCriteria.industries, industry]
    });
  };

  const formatSalary = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Search Criteria</h3>
        
        {/* Job Titles */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Titles
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleArrayAdd('jobTitles', newJobTitle);
                  setNewJobTitle('');
                }
              }}
              placeholder="e.g., Software Engineer, Product Manager"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => {
                handleArrayAdd('jobTitles', newJobTitle);
                setNewJobTitle('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchCriteria.jobTitles.map((title, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {title}
                <button
                  onClick={() => handleArrayRemove('jobTitles', index)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Keywords
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleArrayAdd('keywords', newKeyword);
                  setNewKeyword('');
                }
              }}
              placeholder="e.g., React, Python, Machine Learning"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => {
                handleArrayAdd('keywords', newKeyword);
                setNewKeyword('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchCriteria.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
              >
                {keyword}
                <button
                  onClick={() => handleArrayRemove('keywords', index)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Locations
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleArrayAdd('locations', newLocation);
                  setNewLocation('');
                }
              }}
              placeholder="e.g., San Francisco, New York, Remote"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => {
                handleArrayAdd('locations', newLocation);
                setNewLocation('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchCriteria.locations.map((location, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
              >
                {location}
                <button
                  onClick={() => handleArrayRemove('locations', index)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Remote Work */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={searchCriteria.remoteOk}
              onChange={(e) => onChange({
                ...searchCriteria,
                remoteOk: e.target.checked
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Include remote opportunities
            </span>
          </label>
        </div>

        {/* Salary Range */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Salary Range: {formatSalary(searchCriteria.salaryRange.min)} - {formatSalary(searchCriteria.salaryRange.max)}
          </label>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Minimum Salary</label>
              <input
                type="range"
                min="30000"
                max="300000"
                step="5000"
                value={searchCriteria.salaryRange.min}
                onChange={(e) => handleSalaryChange('min', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$30k</span>
                <span>$300k</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Maximum Salary</label>
              <input
                type="range"
                min="30000"
                max="300000"
                step="5000"
                value={searchCriteria.salaryRange.max}
                onChange={(e) => handleSalaryChange('max', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$30k</span>
                <span>$300k</span>
              </div>
            </div>
          </div>
        </div>

        {/* Experience Level */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experience Level
          </label>
          <select
            value={searchCriteria.experienceLevel}
            onChange={(e) => onChange({
              ...searchCriteria,
              experienceLevel: e.target.value as UserSettings['searchCriteria']['experienceLevel']
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {EXPERIENCE_LEVELS.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* Industries */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industries
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {INDUSTRY_OPTIONS.map(industry => (
              <label key={industry} className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchCriteria.industries.includes(industry)}
                  onChange={() => handleIndustryToggle(industry)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{industry}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}