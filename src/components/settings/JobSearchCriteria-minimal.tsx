'use client';

import React from 'react';
import { UserSettings } from '@/lib/types';

interface JobSearchCriteriaProps {
  searchCriteria: UserSettings['searchCriteria'];
  onChange: (searchCriteria: UserSettings['searchCriteria']) => void;
}

export default function JobSearchCriteria({ searchCriteria, onChange }: JobSearchCriteriaProps) {
  return (
    <div>
      <h3>Job Search Criteria</h3>
      <p>Test component</p>
    </div>
  );
}