'use client';

import React from 'react';
import { UserSettings } from '@/lib/types';

interface ContactInfoSettingsProps {
  contactInfo: UserSettings['contactInfo'];
  onChange: (contactInfo: UserSettings['contactInfo']) => void;
}

export default function ContactInfoSettings({ contactInfo, onChange }: ContactInfoSettingsProps) {
  const handleChange = (field: keyof UserSettings['contactInfo'], value: string) => {
    onChange({
      ...contactInfo,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        
        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={contactInfo.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="your.email@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This email will be used for job notifications and contact forms
          </p>
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={contactInfo.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* LinkedIn */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LinkedIn Profile
          </label>
          <input
            type="url"
            value={contactInfo.linkedin || ''}
            onChange={(e) => handleChange('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/yourprofile"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Portfolio */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Website
          </label>
          <input
            type="url"
            value={contactInfo.portfolio || ''}
            onChange={(e) => handleChange('portfolio', e.target.value)}
            placeholder="https://yourportfolio.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}