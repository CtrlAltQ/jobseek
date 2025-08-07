'use client';

import React from 'react';
import { UserSettings } from '@/lib/types';

interface AgentScheduleSettingsProps {
  agentSchedule: UserSettings['agentSchedule'];
  onChange: (agentSchedule: UserSettings['agentSchedule']) => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Every Hour', description: 'Check for new jobs every hour' },
  { value: 'daily', label: 'Daily', description: 'Check for new jobs once per day' },
  { value: 'weekly', label: 'Weekly', description: 'Check for new jobs once per week' }
] as const;

export default function AgentScheduleSettings({ agentSchedule, onChange }: AgentScheduleSettingsProps) {
  const handleFrequencyChange = (frequency: UserSettings['agentSchedule']['frequency']) => {
    onChange({
      ...agentSchedule,
      frequency
    });
  };

  const handleEnabledChange = (enabled: boolean) => {
    onChange({
      ...agentSchedule,
      enabled
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Schedule</h3>
        
        {/* Enable/Disable Agent */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={agentSchedule.enabled}
              onChange={(e) => handleEnabledChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Enable automatic job discovery
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            When enabled, the AI agent will automatically search for new jobs based on your criteria
          </p>
        </div>

        {/* Frequency Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Search Frequency
          </label>
          <div className="space-y-3">
            {FREQUENCY_OPTIONS.map(option => (
              <label key={option.value} className="flex items-start">
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={agentSchedule.frequency === option.value}
                  onChange={() => handleFrequencyChange(option.value)}
                  disabled={!agentSchedule.enabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                />
                <div className="ml-3">
                  <span className={`text-sm font-medium ${agentSchedule.enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                    {option.label}
                  </span>
                  <p className={`text-xs ${agentSchedule.enabled ? 'text-gray-500' : 'text-gray-400'}`}>
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Schedule Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                How it works
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>The AI agent will search job boards based on your criteria</li>
                  <li>New jobs will be automatically scored for relevance</li>
                  <li>You'll be notified of high-quality matches</li>
                  <li>All discovered jobs appear in your dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Status</h4>
          <div className="flex items-center">
            <div className={`h-2 w-2 rounded-full mr-2 ${agentSchedule.enabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              Agent is {agentSchedule.enabled ? 'enabled' : 'disabled'}
              {agentSchedule.enabled && ` - Running ${agentSchedule.frequency}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}