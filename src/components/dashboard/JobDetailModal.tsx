'use client';

import { JobPosting } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { 
  X, 
  MapPin, 
  Building2, 
  DollarSign, 
  Clock, 
  ExternalLink, 
  Calendar,
  Target,
  Award,
  CheckCircle
} from 'lucide-react';

interface JobDetailModalProps {
  job: JobPosting | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (jobId: string, status: JobPosting['status']) => void;
}

export default function JobDetailModal({ 
  job, 
  isOpen, 
  onClose, 
  onStatusChange 
}: JobDetailModalProps) {
  if (!isOpen || !job) return null;

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
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
            <div className="flex-1 pr-4">
              <h2 id="modal-title" className="text-2xl font-bold text-gray-900 mb-2">
                {job.title}
              </h2>
              <div className="flex items-center text-gray-600 mb-3">
                <Building2 className="w-5 h-5 mr-2" />
                <span className="text-lg font-medium">{job.company}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRelevanceColor(job.relevanceScore)}`}>
                  <Target className="w-4 h-4 mr-1" />
                  {job.relevanceScore}% Match
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                  {job.jobType}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Job Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <span className="font-medium">{job.location}</span>
                    {job.remote && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Remote Available
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <DollarSign className="w-5 h-5 mr-3 text-gray-400" />
                  <span className="font-medium">{formatSalary(job.salary)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-gray-700">
                  <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                  <span>Posted {formatDistanceToNow(new Date(job.postedDate), { addSuffix: true })}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Clock className="w-5 h-5 mr-3 text-gray-400" />
                  <span>Discovered {formatDistanceToNow(new Date(job.discoveredDate), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {job.aiSummary && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-blue-500" />
                  AI Summary
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">{job.aiSummary}</p>
                </div>
              </div>
            )}

            {/* Job Description */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {job.description}
                </div>
              </div>
            </div>

            {/* Requirements */}
            {job.requirements.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                <ul className="space-y-2">
                  {job.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-4 h-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {job.benefits.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h3>
                <ul className="space-y-2">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <Award className="w-4 h-4 mr-2 mt-1 text-blue-500 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source Information */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600">Source: </span>
                  <span className="font-medium text-gray-900">{job.source}</span>
                </div>
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Original Posting
                </a>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Job ID: {job._id}
            </div>
            
            <div className="flex gap-3">
              {job.status !== 'applied' && (
                <button
                  onClick={() => {
                    onStatusChange(job._id!, 'applied');
                    onClose();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  Mark as Applied
                </button>
              )}
              {job.status !== 'dismissed' && (
                <button
                  onClick={() => {
                    onStatusChange(job._id!, 'dismissed');
                    onClose();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Dismiss Job
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}