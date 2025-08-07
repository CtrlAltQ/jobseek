import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(salary?: { min?: number; max?: number; currency: string }): string {
  if (!salary) return 'Salary not specified';
  
  const { min, max, currency } = salary;
  const symbol = currency === 'USD' ? '$' : currency;
  
  if (min && max) {
    return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
  } else if (min) {
    return `${symbol}${min.toLocaleString()}+`;
  } else if (max) {
    return `Up to ${symbol}${max.toLocaleString()}`;
  }
  
  return 'Salary not specified';
}

export function formatDate(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export function getRelevanceColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-100';
  if (score >= 60) return 'text-yellow-600 bg-yellow-100';
  if (score >= 40) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function generateJobId(job: { title: string; company: string; source: string }): string {
  const combined = `${job.title}-${job.company}-${job.source}`.toLowerCase();
  return combined.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}