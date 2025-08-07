'use client';

import { JobPosting } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Building2, DollarSign, Clock, ExternalLink } from 'lucide-react';

interface JobCardProps {
  job: JobPosting;
  onStatusChange: (jobId: string, status: JobPosting['status']) => void;
  onViewDetails: (job: JobPosting) => void;
}

export default function JobCard({ job, onStatusChange, onViewDetails }: JobCardProps) {
  const formatSalary = (salary?: JobPosting['salary']) => {
    if (!salary) return 'Salary not specified';
    
    const { min, max, currency = 'USD' } = salary;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
      return `${formatter.format(min)}+`;
    } else if (max) {
      return `Up to ${formatter.format(max)}`;
    }
    return 'Salary not specified';
  };

  const getStatusColor = (status: JobPosting['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'applied':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'dismissed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200" tabIndex={-1}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {job.title}
          </h3>
          <div className="flex items-center text-gray-600 mb-2">
            <Building2 className="w-4 h-4 mr-1" />
            <span className="font-medium">{job.company}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
          <div className="flex items-center text-sm">
            <span className="text-gray-500 mr-1">Relevance:</span>
            <span className={`font-medium ${getRelevanceColor(job.relevanceScore)}`}>
              {job.relevanceScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-600">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{job.location}</span>
          {job.remote && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Remote
            </span>
          )}
        </div>
        
        <div className="flex items-center text-gray-600">
          <DollarSign className="w-4 h-4 mr-2" />
          <span>{formatSalary(job.salary)}</span>
        </div>

        <div className="flex items-center text-gray-600">
          <Clock className="w-4 h-4 mr-2" />
          <span>Posted {formatDistanceToNow(new Date(job.postedDate), { addSuffix: true })}</span>
        </div>
      </div>

      {/* AI Summary */}
      {job.aiSummary && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-700 line-clamp-2">{job.aiSummary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(job)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            View Details
          </button>
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View Original
          </a>
        </div>

        <div className="flex gap-2">
          {job.status !== 'applied' && (
            <button
              onClick={() => onStatusChange(job._id!, 'applied')}
              className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
            >
              Mark Applied
            </button>
          )}
          {job.status !== 'dismissed' && (
            <button
              onClick={() => onStatusChange(job._id!, 'dismissed')}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}