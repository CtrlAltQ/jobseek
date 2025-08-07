"""
Data Processing Utilities

This module provides utilities for processing, validating, and normalizing job data.
"""

import re
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class SalaryInfo:
    """Parsed salary information."""
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    currency: str = 'USD'
    period: str = 'year'  # 'hour', 'day', 'month', 'year'

class JobDataProcessor:
    """Utility class for processing and normalizing job data."""
    
    # Common job type mappings
    JOB_TYPE_MAPPINGS = {
        'full time': 'full-time',
        'fulltime': 'full-time',
        'ft': 'full-time',
        'part time': 'part-time',
        'parttime': 'part-time',
        'pt': 'part-time',
        'contractor': 'contract',
        'freelance': 'contract',
        'temporary': 'contract',
        'temp': 'contract',
        'intern': 'internship',
        'internship': 'internship',
    }
    
    # Remote work indicators
    REMOTE_INDICATORS = [
        'remote', 'work from home', 'wfh', 'telecommute', 'distributed',
        'anywhere', 'home office', 'virtual', 'remote-first'
    ]
    
    # Salary parsing patterns
    SALARY_PATTERNS = [
        # $50,000 - $70,000 per year
        r'\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)\s*(?:per\s+)?(year|annually|yr|k)?',
        # $50k - $70k
        r'\$?([\d,]+)k\s*[-–—]\s*\$?([\d,]+)k',
        # $25 - $35 per hour
        r'\$?([\d,]+)\s*[-–—]\s*\$?([\d,]+)\s*(?:per\s+)?(hour|hr|hourly)',
        # Up to $70,000
        r'up\s+to\s+\$?([\d,]+)\s*(?:per\s+)?(year|annually|yr|k)?',
        # $70,000+
        r'\$?([\d,]+)\+\s*(?:per\s+)?(year|annually|yr|k)?',
        # Single salary: $70,000 per year (with explicit per year)
        r'\$?([\d,]+)\s+per\s+(year|annually|yr|hour|hr|hourly)',
        # Single salary: $70,000 (without per year)
        r'\$?([\d,]+)(?:\s*k)?',
    ]
    
    @staticmethod
    def normalize_job_type(job_type: str) -> str:
        """Normalize job type to standard format."""
        if not job_type:
            return 'full-time'  # Default
        
        normalized = job_type.lower().strip()
        return JobDataProcessor.JOB_TYPE_MAPPINGS.get(normalized, normalized)
    
    @staticmethod
    def detect_remote_work(text: str) -> bool:
        """Detect if a job is remote based on text content."""
        if not text:
            return False
        
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in JobDataProcessor.REMOTE_INDICATORS)
    
    @staticmethod
    def parse_salary(salary_text: str) -> SalaryInfo:
        """Parse salary information from text."""
        if not salary_text:
            return SalaryInfo()
        
        # Clean the text - be more careful with regex characters
        cleaned_text = salary_text.lower().strip()
        
        for pattern in JobDataProcessor.SALARY_PATTERNS:
            match = re.search(pattern, cleaned_text, re.IGNORECASE)
            if match:
                try:
                    groups = match.groups()
                    
                    # Handle different pattern types
                    if len(groups) >= 2 and groups[1] and groups[1].replace(',', '').isdigit():  # Range pattern
                        min_val = float(groups[0].replace(',', ''))
                        max_val = float(groups[1].replace(',', ''))
                        period = groups[2] if len(groups) > 2 and groups[2] else 'year'
                    else:  # Single value pattern
                        min_val = float(groups[0].replace(',', ''))
                        max_val = None
                        # Find the period in the groups
                        period = 'year'  # default
                        for group in groups[1:]:
                            if group and group in ['year', 'annually', 'yr', 'k', 'hour', 'hr', 'hourly']:
                                period = group
                                break
                    
                    # Handle 'k' suffix (thousands)
                    if 'k' in salary_text.lower() or (period and 'k' in period):
                        min_val *= 1000
                        if max_val:
                            max_val *= 1000
                        period = 'year'
                    
                    # Normalize period
                    if period in ['hr', 'hourly']:
                        period = 'hour'
                    elif period in ['annually', 'yr', 'k']:
                        period = 'year'
                    
                    return SalaryInfo(
                        min_salary=min_val,
                        max_salary=max_val,
                        period=period or 'year'
                    )
                    
                except (ValueError, IndexError) as e:
                    logger.debug(f"Failed to parse salary '{salary_text}': {e}")
                    continue
        
        return SalaryInfo()
    
    @staticmethod
    def extract_requirements(description: str) -> List[str]:
        """Extract job requirements from description text."""
        if not description:
            return []
        
        requirements = []
        
        # Common requirement section headers
        requirement_headers = [
            r'requirements?:',
            r'qualifications?:',
            r'skills?:',
            r'experience:',
            r'must have:',
            r'you should have:',
            r'we\'re looking for:',
            r'ideal candidate:',
            r'preferred:',
        ]
        
        # Find requirement sections
        for header in requirement_headers:
            pattern = rf'{header}\s*(.*?)(?:\n\n|\n[A-Z]|$)'
            match = re.search(pattern, description, re.IGNORECASE | re.DOTALL)
            if match:
                section_text = match.group(1)
                
                # Extract bullet points or line items
                lines = section_text.split('\n')
                for line in lines:
                    line = line.strip()
                    # Remove bullet points and clean up
                    line = re.sub(r'^[-•*]\s*', '', line)
                    if line and len(line) > 10:  # Filter out very short items
                        requirements.append(line)
        
        # If no structured requirements found, extract common tech skills
        if not requirements:
            tech_skills = JobDataProcessor._extract_tech_skills(description)
            requirements.extend(tech_skills)
        
        # Remove duplicates and limit length
        unique_requirements = list(dict.fromkeys(requirements))[:10]
        return unique_requirements
    
    @staticmethod
    def _extract_tech_skills(text: str) -> List[str]:
        """Extract common technology skills from text."""
        # Common tech skills to look for
        tech_skills = [
            'Python', 'JavaScript', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Go', 'Rust',
            'React', 'Vue', 'Angular', 'Node.js', 'Django', 'Flask', 'Spring',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins',
            'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
            'Git', 'Linux', 'Agile', 'Scrum', 'DevOps', 'CI/CD',
            'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch'
        ]
        
        found_skills = []
        text_lower = text.lower()
        
        for skill in tech_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)
        
        return found_skills
    
    @staticmethod
    def extract_benefits(description: str) -> List[str]:
        """Extract job benefits from description text."""
        if not description:
            return []
        
        benefits = []
        
        # Common benefit section headers
        benefit_headers = [
            r'benefits?:',
            r'perks?:',
            r'we offer:',
            r'what we offer:',
            r'compensation:',
            r'package includes:',
        ]
        
        # Find benefit sections
        for header in benefit_headers:
            pattern = rf'{header}\s*(.*?)(?:\n\n|\n[A-Z]|$)'
            match = re.search(pattern, description, re.IGNORECASE | re.DOTALL)
            if match:
                section_text = match.group(1)
                
                # Extract bullet points or line items
                lines = section_text.split('\n')
                for line in lines:
                    line = line.strip()
                    # Remove bullet points and clean up
                    line = re.sub(r'^[-•*]\s*', '', line)
                    if line and len(line) > 5:  # Filter out very short items
                        benefits.append(line)
        
        # If no structured benefits found, look for common benefit keywords
        if not benefits:
            common_benefits = [
                'health insurance', 'dental insurance', 'vision insurance',
                '401k', 'retirement plan', 'pension',
                'paid time off', 'pto', 'vacation days',
                'flexible hours', 'work from home', 'remote work',
                'stock options', 'equity', 'bonus',
                'professional development', 'training', 'conferences',
                'gym membership', 'wellness program',
                'free lunch', 'snacks', 'coffee'
            ]
            
            text_lower = description.lower()
            for benefit in common_benefits:
                if benefit in text_lower:
                    benefits.append(benefit.title())
        
        # Remove duplicates and limit length
        unique_benefits = list(dict.fromkeys(benefits))[:8]
        return unique_benefits
    
    @staticmethod
    def parse_posted_date(date_text: str) -> datetime:
        """Parse job posted date from various text formats."""
        if not date_text:
            return datetime.now()
        
        # Clean the text
        date_text = date_text.lower().strip()
        now = datetime.now()
        
        # Handle relative dates
        if 'today' in date_text or 'just posted' in date_text:
            return now
        elif 'yesterday' in date_text:
            return now - timedelta(days=1)
        elif 'days ago' in date_text:
            match = re.search(r'(\d+)\s*days?\s+ago', date_text)
            if match:
                days = int(match.group(1))
                return now - timedelta(days=days)
        elif 'hours ago' in date_text:
            match = re.search(r'(\d+)\s*hours?\s+ago', date_text)
            if match:
                hours = int(match.group(1))
                return now - timedelta(hours=hours)
        elif 'weeks ago' in date_text:
            match = re.search(r'(\d+)\s*weeks?\s+ago', date_text)
            if match:
                weeks = int(match.group(1))
                return now - timedelta(weeks=weeks)
        elif 'months ago' in date_text:
            match = re.search(r'(\d+)\s*months?\s+ago', date_text)
            if match:
                months = int(match.group(1))
                return now - timedelta(days=months * 30)
        
        # Try to parse absolute dates
        date_formats = [
            '%Y-%m-%d',
            '%m/%d/%Y',
            '%d/%m/%Y',
            '%B %d, %Y',
            '%b %d, %Y',
            '%d %B %Y',
            '%d %b %Y',
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_text, fmt)
            except ValueError:
                continue
        
        # If all else fails, return current time
        logger.debug(f"Could not parse date: {date_text}")
        return now
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text content."""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common unwanted characters
        text = re.sub(r'[^\w\s\-.,!?():/]', '', text)
        
        return text
    
    @staticmethod
    def validate_job_data(job_data: Dict) -> Tuple[bool, List[str]]:
        """Validate job data completeness and quality."""
        errors = []
        
        # Required fields
        required_fields = ['title', 'company', 'location', 'description', 'source_url']
        for field in required_fields:
            if not job_data.get(field):
                errors.append(f"Missing required field: {field}")
        
        # Validate field lengths
        if job_data.get('title') and len(job_data['title']) < 3:
            errors.append("Job title too short")
        
        if job_data.get('company') and len(job_data['company']) < 2:
            errors.append("Company name too short")
        
        if job_data.get('description') and len(job_data['description']) < 50:
            errors.append("Job description too short")
        
        # Validate URL format
        if job_data.get('source_url'):
            url_pattern = r'^https?://.+'
            if not re.match(url_pattern, job_data['source_url']):
                errors.append("Invalid source URL format")
        
        # Validate job type
        valid_job_types = ['full-time', 'part-time', 'contract', 'internship']
        if job_data.get('job_type') and job_data['job_type'] not in valid_job_types:
            errors.append(f"Invalid job type: {job_data['job_type']}")
        
        return len(errors) == 0, errors