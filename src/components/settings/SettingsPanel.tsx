'use client';

import React, { useState, useEffect } from 'react';
import { UserSettings } from '@/lib/types';
import { validateUserSettings } from '@/lib/schemas';
import { useSettings } from '@/hooks/useApiData';
import { offlineSettingsApi } from '@/lib/offline';
import JobSearchCriteria from './JobSearchCriteria';
import ContactInfoSettings from './ContactInfoSettings';
import AgentScheduleSettings from './AgentScheduleSettings';

interface SettingsPanelProps {
  onSettingsChange?: (settings: UserSettings) => void;
  className?: string;
}

const defaultSettings: UserSettings = {
  searchCriteria: {
    jobTitles: [],
    keywords: [],
    locations: [],
    remoteOk: true,
    salaryRange: {
      min: 50000,
      max: 150000
    },
    industries: [],
    experienceLevel: 'mid'
  },
  contactInfo: {
    email: '',
    phone: '',
    linkedin: '',
    portfolio: ''
  },
  agentSchedule: {
    frequency: 'daily',
    enabled: true
  },
  updatedAt: new Date()
};

export default function SettingsPanel({ onSettingsChange, className = '' }: SettingsPanelProps) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Use the new API hook with caching and real-time updates
  const { 
    data: settingsData, 
    loading, 
    error: apiError, 
    mutate: mutateSettings 
  } = useSettings();

  const settings = settingsData || defaultSettings;

  const saveSettings = async () => {
    try {
      setSaving(true);
      setErrors([]);
      setSuccessMessage('');

      // Validate settings before saving
      const validationErrors = validateUserSettings(settings);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Use offline-aware API
      const updatedSettings = await offlineSettingsApi.updateSettings(settings);
      
      // Update local state optimistically
      mutateSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
      
      setSuccessMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setErrors(['Failed to save settings. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsChange = (newSettings: Partial<UserSettings>) => {
    const updatedSettings = {
      ...(settings as any || {}),
      ...newSettings,
      updatedAt: new Date()
    } as UserSettings;
    
    // Update local state optimistically
    mutateSettings(updatedSettings);
    setErrors([]);
    setSuccessMessage('');
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">
          Configure your job search criteria and agent preferences
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Please fix the following errors:
                </h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Job Search Criteria */}
        <JobSearchCriteria
          searchCriteria={(settings as any)?.searchCriteria}
          onChange={(searchCriteria) => handleSettingsChange({ searchCriteria })}
        />

        {/* Contact Information */}
        <ContactInfoSettings
          contactInfo={(settings as any)?.contactInfo}
          onChange={(contactInfo) => handleSettingsChange({ contactInfo })}
        />

        {/* Agent Schedule */}
        <AgentScheduleSettings
          agentSchedule={(settings as any)?.agentSchedule}
          onChange={(agentSchedule) => handleSettingsChange({ agentSchedule })}
        />

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 flex items-center"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}