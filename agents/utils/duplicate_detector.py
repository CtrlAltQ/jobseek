"""
Duplicate Detection System

This module provides sophisticated duplicate detection for job postings
using multiple strategies including exact matching, fuzzy matching, and content similarity.
"""

import hashlib
import logging
from typing import List, Dict, Set, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher
import re

logger = logging.getLogger(__name__)

@dataclass
class DuplicateMatch:
    """Represents a potential duplicate match."""
    job1_hash: str
    job2_hash: str
    similarity_score: float
    match_type: str  # 'exact', 'fuzzy', 'content'
    confidence: float

class DuplicateDetector:
    """Advanced duplicate detection system for job postings."""
    
    def __init__(self, similarity_threshold: float = 0.85):
        self.similarity_threshold = similarity_threshold
        self.exact_matches: Set[str] = set()
        self.fuzzy_matches: Dict[str, List[str]] = {}
        self.content_hashes: Dict[str, str] = {}
        self.job_signatures: Dict[str, Dict] = {}
        
    def add_job(self, job_data: Dict) -> Tuple[bool, str]:
        """
        Add a job to the duplicate detection system.
        Returns (is_duplicate, duplicate_reason)
        """
        job_hash = self._generate_job_hash(job_data)
        
        # Check for exact duplicates first
        if self._is_exact_duplicate(job_data, job_hash):
            return True, "exact_match"
        
        # Check for fuzzy duplicates
        fuzzy_match = self._find_fuzzy_duplicate(job_data, job_hash)
        if fuzzy_match:
            return True, f"fuzzy_match_{fuzzy_match.similarity_score:.2f}"
        
        # Check for content similarity
        content_match = self._find_content_duplicate(job_data, job_hash)
        if content_match:
            return True, f"content_match_{content_match.similarity_score:.2f}"
        
        # Not a duplicate, add to tracking
        self._add_to_tracking(job_data, job_hash)
        return False, "unique"
    
    def _generate_job_hash(self, job_data: Dict) -> str:
        """Generate a unique hash for a job posting."""
        # Primary hash based on title, company, and URL
        primary_string = f"{job_data.get('title', '').lower().strip()}|{job_data.get('company', '').lower().strip()}|{job_data.get('source_url', '')}"
        return hashlib.md5(primary_string.encode()).hexdigest()
    
    def _is_exact_duplicate(self, job_data: Dict, job_hash: str) -> bool:
        """Check for exact duplicates using hash matching."""
        if job_hash in self.exact_matches:
            logger.debug(f"Exact duplicate found: {job_data.get('title')} at {job_data.get('company')}")
            return True
        return False
    
    def _find_fuzzy_duplicate(self, job_data: Dict, job_hash: str) -> DuplicateMatch:
        """Find fuzzy duplicates using string similarity."""
        title = job_data.get('title', '').lower().strip()
        company = job_data.get('company', '').lower().strip()
        location = job_data.get('location', '').lower().strip()
        
        # Create a signature for fuzzy matching
        current_signature = self._create_job_signature(job_data)
        
        # Compare with existing signatures
        for existing_hash, existing_signature in self.job_signatures.items():
            if existing_hash == job_hash:
                continue
                
            similarity = self._calculate_signature_similarity(current_signature, existing_signature)
            
            if similarity >= self.similarity_threshold:
                logger.debug(f"Fuzzy duplicate found: {title} at {company} (similarity: {similarity:.2f})")
                return DuplicateMatch(
                    job1_hash=job_hash,
                    job2_hash=existing_hash,
                    similarity_score=similarity,
                    match_type='fuzzy',
                    confidence=similarity
                )
        
        return None
    
    def _find_content_duplicate(self, job_data: Dict, job_hash: str) -> DuplicateMatch:
        """Find duplicates based on content similarity."""
        description = job_data.get('description', '')
        if not description or len(description) < 100:
            return None
        
        # Create content hash
        content_hash = self._generate_content_hash(description)
        
        # Check against existing content hashes
        for existing_hash, existing_content_hash in self.content_hashes.items():
            if existing_hash == job_hash:
                continue
                
            # Calculate content similarity
            similarity = self._calculate_content_similarity(content_hash, existing_content_hash)
            
            if similarity >= self.similarity_threshold:
                logger.debug(f"Content duplicate found: {job_data.get('title')} (similarity: {similarity:.2f})")
                return DuplicateMatch(
                    job1_hash=job_hash,
                    job2_hash=existing_hash,
                    similarity_score=similarity,
                    match_type='content',
                    confidence=similarity
                )
        
        return None
    
    def _create_job_signature(self, job_data: Dict) -> Dict:
        """Create a signature for fuzzy matching."""
        title = self._normalize_title(job_data.get('title', ''))
        company = self._normalize_company(job_data.get('company', ''))
        location = self._normalize_location(job_data.get('location', ''))
        
        return {
            'title': title,
            'company': company,
            'location': location,
            'title_words': set(title.split()),
            'company_words': set(company.split()),
            'location_words': set(location.split()),
        }
    
    def _calculate_signature_similarity(self, sig1: Dict, sig2: Dict) -> float:
        """Calculate similarity between two job signatures."""
        # Title similarity (weighted heavily)
        title_sim = SequenceMatcher(None, sig1['title'], sig2['title']).ratio()
        
        # Company similarity (weighted heavily)
        company_sim = SequenceMatcher(None, sig1['company'], sig2['company']).ratio()
        
        # Location similarity (weighted less)
        location_sim = SequenceMatcher(None, sig1['location'], sig2['location']).ratio()
        
        # Word overlap similarity
        title_word_overlap = len(sig1['title_words'] & sig2['title_words']) / max(len(sig1['title_words'] | sig2['title_words']), 1)
        company_word_overlap = len(sig1['company_words'] & sig2['company_words']) / max(len(sig1['company_words'] | sig2['company_words']), 1)
        
        # Weighted average
        similarity = (
            title_sim * 0.4 +
            company_sim * 0.3 +
            location_sim * 0.1 +
            title_word_overlap * 0.15 +
            company_word_overlap * 0.05
        )
        
        return similarity
    
    def _generate_content_hash(self, description: str) -> str:
        """Generate a hash for content similarity checking."""
        # Normalize the description
        normalized = self._normalize_description(description)
        
        # Create hash of normalized content
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def _calculate_content_similarity(self, hash1: str, hash2: str) -> float:
        """Calculate content similarity between two hashes."""
        # For now, use exact hash matching for content
        # In a more sophisticated implementation, you could use:
        # - Shingling
        # - MinHash
        # - Locality Sensitive Hashing (LSH)
        return 1.0 if hash1 == hash2 else 0.0
    
    def _normalize_title(self, title: str) -> str:
        """Normalize job title for comparison."""
        if not title:
            return ""
        
        # Convert to lowercase
        normalized = title.lower().strip()
        
        # Remove common variations
        normalized = re.sub(r'\b(sr|senior|jr|junior)\b\.?', '', normalized)
        normalized = re.sub(r'\b(i|ii|iii|iv|v|1|2|3|4|5)\b', '', normalized)
        normalized = re.sub(r'\b(level|lvl)\s*\d+\b', '', normalized)
        
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return normalized
    
    def _normalize_company(self, company: str) -> str:
        """Normalize company name for comparison."""
        if not company:
            return ""
        
        # Convert to lowercase
        normalized = company.lower().strip()
        
        # Remove common suffixes
        suffixes = ['inc', 'corp', 'corporation', 'llc', 'ltd', 'limited', 'co', 'company']
        for suffix in suffixes:
            normalized = re.sub(rf'\b{suffix}\.?$', '', normalized)
        
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return normalized
    
    def _normalize_location(self, location: str) -> str:
        """Normalize location for comparison."""
        if not location:
            return ""
        
        # Convert to lowercase
        normalized = location.lower().strip()
        
        # Remove common location variations
        normalized = re.sub(r'\b(remote|work from home|wfh)\b', 'remote', normalized)
        normalized = re.sub(r'\b(usa|united states|us)\b', 'us', normalized)
        
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return normalized
    
    def _normalize_description(self, description: str) -> str:
        """Normalize job description for content comparison."""
        if not description:
            return ""
        
        # Convert to lowercase
        normalized = description.lower()
        
        # Remove HTML tags
        normalized = re.sub(r'<[^>]+>', '', normalized)
        
        # Remove extra whitespace and normalize
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        # Remove very common words that don't add meaning
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'}
        words = normalized.split()
        filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
        
        return ' '.join(filtered_words)
    
    def _add_to_tracking(self, job_data: Dict, job_hash: str):
        """Add job to tracking systems."""
        # Add to exact matches
        self.exact_matches.add(job_hash)
        
        # Add signature for fuzzy matching
        self.job_signatures[job_hash] = self._create_job_signature(job_data)
        
        # Add content hash
        description = job_data.get('description', '')
        if description:
            self.content_hashes[job_hash] = self._generate_content_hash(description)
    
    def get_stats(self) -> Dict:
        """Get duplicate detection statistics."""
        return {
            'total_jobs_tracked': len(self.exact_matches),
            'fuzzy_signatures': len(self.job_signatures),
            'content_hashes': len(self.content_hashes),
            'similarity_threshold': self.similarity_threshold
        }
    
    def clear(self):
        """Clear all tracking data."""
        self.exact_matches.clear()
        self.fuzzy_matches.clear()
        self.content_hashes.clear()
        self.job_signatures.clear()
        logger.info("Duplicate detector cleared")