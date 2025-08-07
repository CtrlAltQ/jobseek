"""
Monitoring and Alerting for Agent-API Connectivity

This module provides monitoring capabilities for tracking agent performance,
API connectivity, and system health with alerting mechanisms.
"""

import asyncio
import logging
import json
import smtplib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from pathlib import Path

from api_client import NodeApiClient, create_api_client, ApiClientError

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class HealthStatus(Enum):
    """System health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

@dataclass
class Alert:
    """Represents a system alert."""
    id: str
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime
    component: str
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = asdict(self)
        data['level'] = self.level.value
        data['timestamp'] = self.timestamp.isoformat()
        data['resolved_at'] = self.resolved_at.isoformat() if self.resolved_at else None
        return data

@dataclass
class HealthMetrics:
    """System health metrics."""
    api_connectivity: HealthStatus
    last_successful_sync: Optional[datetime]
    failed_sync_count: int
    average_response_time: float
    active_agents: int
    total_jobs_synced: int
    error_rate: float
    uptime_percentage: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = asdict(self)
        data['api_connectivity'] = self.api_connectivity.value
        data['last_successful_sync'] = self.last_successful_sync.isoformat() if self.last_successful_sync else None
        return data

class SystemMonitor:
    """Main system monitoring class."""
    
    def __init__(self, api_client: NodeApiClient, config: Dict[str, Any]):
        """
        Initialize the system monitor.
        
        Args:
            api_client: API client for connectivity monitoring
            config: Monitoring configuration
        """
        self.api_client = api_client
        self.config = config
        self.alerts: List[Alert] = []
        self.metrics_history: List[HealthMetrics] = []
        self.alert_handlers: List[Callable] = []
        self.is_monitoring = False
        self.monitor_task: Optional[asyncio.Task] = None
        
        # Load existing alerts and metrics
        self._load_state()
        
        # Setup default alert handlers
        self._setup_alert_handlers()
        
        logger.info("System monitor initialized")
    
    def _load_state(self):
        """Load monitoring state from disk."""
        try:
            state_file = Path("monitoring_state.json")
            if state_file.exists():
                with open(state_file, 'r') as f:
                    state = json.load(f)
                
                # Load alerts
                for alert_data in state.get('alerts', []):
                    alert = Alert(
                        id=alert_data['id'],
                        level=AlertLevel(alert_data['level']),
                        title=alert_data['title'],
                        message=alert_data['message'],
                        timestamp=datetime.fromisoformat(alert_data['timestamp']),
                        component=alert_data['component'],
                        resolved=alert_data['resolved'],
                        resolved_at=datetime.fromisoformat(alert_data['resolved_at']) if alert_data['resolved_at'] else None
                    )
                    self.alerts.append(alert)
                
                logger.info(f"Loaded {len(self.alerts)} alerts from state file")
        
        except Exception as e:
            logger.warning(f"Failed to load monitoring state: {str(e)}")
    
    def _save_state(self):
        """Save monitoring state to disk."""
        try:
            state = {
                'alerts': [alert.to_dict() for alert in self.alerts[-100:]],  # Keep last 100 alerts
                'last_updated': datetime.now().isoformat()
            }
            
            with open("monitoring_state.json", 'w') as f:
                json.dump(state, f, indent=2)
        
        except Exception as e:
            logger.error(f"Failed to save monitoring state: {str(e)}")
    
    def _setup_alert_handlers(self):
        """Setup default alert handlers."""
        # Console logging handler
        self.add_alert_handler(self._console_alert_handler)
        
        # Email handler if configured
        email_config = self.config.get('email', {})
        if email_config.get('enabled', False):
            self.add_alert_handler(self._email_alert_handler)
        
        # File logging handler
        self.add_alert_handler(self._file_alert_handler)
    
    def add_alert_handler(self, handler: Callable[[Alert], None]):
        """Add an alert handler function."""
        self.alert_handlers.append(handler)
    
    async def start_monitoring(self, interval: int = 60):
        """
        Start continuous monitoring.
        
        Args:
            interval: Monitoring interval in seconds
        """
        if self.is_monitoring:
            logger.warning("Monitoring is already running")
            return
        
        self.is_monitoring = True
        self.monitor_task = asyncio.create_task(self._monitoring_loop(interval))
        logger.info(f"Started monitoring with {interval}s interval")
    
    async def stop_monitoring(self):
        """Stop continuous monitoring."""
        if not self.is_monitoring:
            return
        
        self.is_monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        
        self._save_state()
        logger.info("Stopped monitoring")
    
    async def _monitoring_loop(self, interval: int):
        """Main monitoring loop."""
        while self.is_monitoring:
            try:
                await self._collect_metrics()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}")
                await asyncio.sleep(interval)
    
    async def _collect_metrics(self):
        """Collect system health metrics."""
        try:
            # Test API connectivity
            start_time = datetime.now()
            api_healthy = await self.api_client.test_connection()
            response_time = (datetime.now() - start_time).total_seconds()
            
            # Get agent status
            agent_status = None
            if api_healthy:
                try:
                    status_response = await self.api_client.get_agent_status()
                    if status_response.success:
                        agent_status = status_response.data
                except Exception as e:
                    logger.warning(f"Failed to get agent status: {str(e)}")
            
            # Calculate metrics
            metrics = await self._calculate_health_metrics(api_healthy, response_time, agent_status)
            self.metrics_history.append(metrics)
            
            # Keep only recent metrics (last 24 hours worth)
            cutoff_time = datetime.now() - timedelta(hours=24)
            self.metrics_history = [m for m in self.metrics_history if m.last_successful_sync and m.last_successful_sync > cutoff_time]
            
            # Check for alerts
            await self._check_alerts(metrics)
            
            logger.debug(f"Collected metrics: API={metrics.api_connectivity.value}, Response={response_time:.2f}s")
        
        except Exception as e:
            logger.error(f"Failed to collect metrics: {str(e)}")
    
    async def _calculate_health_metrics(
        self, 
        api_healthy: bool, 
        response_time: float, 
        agent_status: Optional[Dict]
    ) -> HealthMetrics:
        """Calculate current health metrics."""
        # Determine API connectivity status
        if api_healthy:
            api_connectivity = HealthStatus.HEALTHY
        else:
            api_connectivity = HealthStatus.UNHEALTHY
        
        # Get recent metrics for calculations
        recent_metrics = self.metrics_history[-10:] if self.metrics_history else []
        
        # Calculate averages
        if recent_metrics:
            avg_response_time = sum(m.average_response_time for m in recent_metrics) / len(recent_metrics)
            error_rate = sum(1 for m in recent_metrics if m.api_connectivity == HealthStatus.UNHEALTHY) / len(recent_metrics)
        else:
            avg_response_time = response_time
            error_rate = 0.0 if api_healthy else 1.0
        
        # Extract agent information
        active_agents = 0
        if agent_status:
            system_status = agent_status.get('systemStatus', {})
            active_agents = system_status.get('runningAgents', 0)
        
        return HealthMetrics(
            api_connectivity=api_connectivity,
            last_successful_sync=datetime.now() if api_healthy else None,
            failed_sync_count=sum(1 for m in recent_metrics if m.api_connectivity == HealthStatus.UNHEALTHY),
            average_response_time=avg_response_time,
            active_agents=active_agents,
            total_jobs_synced=0,  # Would need to track this separately
            error_rate=error_rate,
            uptime_percentage=(1.0 - error_rate) * 100
        )
    
    async def _check_alerts(self, metrics: HealthMetrics):
        """Check metrics against alert thresholds."""
        config = self.config.get('alerts', {})
        
        # API connectivity alerts
        if metrics.api_connectivity == HealthStatus.UNHEALTHY:
            await self._create_alert(
                AlertLevel.ERROR,
                "API Connectivity Lost",
                "Unable to connect to Node.js API",
                "api_connectivity"
            )
        elif metrics.api_connectivity == HealthStatus.HEALTHY:
            await self._resolve_alerts("api_connectivity")
        
        # Response time alerts
        response_threshold = config.get('response_time_threshold', 10.0)
        if metrics.average_response_time > response_threshold:
            await self._create_alert(
                AlertLevel.WARNING,
                "High API Response Time",
                f"API response time is {metrics.average_response_time:.2f}s (threshold: {response_threshold}s)",
                "response_time"
            )
        
        # Error rate alerts
        error_threshold = config.get('error_rate_threshold', 0.5)
        if metrics.error_rate > error_threshold:
            await self._create_alert(
                AlertLevel.ERROR,
                "High Error Rate",
                f"Error rate is {metrics.error_rate:.1%} (threshold: {error_threshold:.1%})",
                "error_rate"
            )
        
        # No active agents alert
        if metrics.active_agents == 0:
            await self._create_alert(
                AlertLevel.WARNING,
                "No Active Agents",
                "No agents are currently running",
                "agent_activity"
            )
    
    async def _create_alert(self, level: AlertLevel, title: str, message: str, component: str):
        """Create a new alert if it doesn't already exist."""
        # Check if similar alert already exists
        existing_alert = next(
            (a for a in self.alerts if a.component == component and not a.resolved),
            None
        )
        
        if existing_alert:
            return  # Don't create duplicate alerts
        
        alert = Alert(
            id=f"{component}_{int(datetime.now().timestamp())}",
            level=level,
            title=title,
            message=message,
            timestamp=datetime.now(),
            component=component
        )
        
        self.alerts.append(alert)
        
        # Trigger alert handlers
        for handler in self.alert_handlers:
            try:
                await asyncio.get_event_loop().run_in_executor(None, handler, alert)
            except Exception as e:
                logger.error(f"Alert handler failed: {str(e)}")
        
        logger.info(f"Created {level.value} alert: {title}")
    
    async def _resolve_alerts(self, component: str):
        """Resolve all active alerts for a component."""
        resolved_count = 0
        for alert in self.alerts:
            if alert.component == component and not alert.resolved:
                alert.resolved = True
                alert.resolved_at = datetime.now()
                resolved_count += 1
        
        if resolved_count > 0:
            logger.info(f"Resolved {resolved_count} alerts for component: {component}")
    
    def _console_alert_handler(self, alert: Alert):
        """Log alert to console."""
        level_colors = {
            AlertLevel.INFO: '\033[94m',      # Blue
            AlertLevel.WARNING: '\033[93m',   # Yellow
            AlertLevel.ERROR: '\033[91m',     # Red
            AlertLevel.CRITICAL: '\033[95m'   # Magenta
        }
        
        color = level_colors.get(alert.level, '')
        reset = '\033[0m'
        
        print(f"{color}[{alert.level.value.upper()}] {alert.title}: {alert.message}{reset}")
    
    def _file_alert_handler(self, alert: Alert):
        """Log alert to file."""
        try:
            with open("alerts.log", "a") as f:
                f.write(f"{alert.timestamp.isoformat()} [{alert.level.value.upper()}] {alert.title}: {alert.message}\n")
        except Exception as e:
            logger.error(f"Failed to write alert to file: {str(e)}")
    
    def _email_alert_handler(self, alert: Alert):
        """Send alert via email."""
        try:
            email_config = self.config.get('email', {})
            if not email_config.get('enabled', False):
                return
            
            # Only send emails for ERROR and CRITICAL alerts
            if alert.level not in [AlertLevel.ERROR, AlertLevel.CRITICAL]:
                return
            
            smtp_server = email_config.get('smtp_server')
            smtp_port = email_config.get('smtp_port', 587)
            username = email_config.get('username')
            password = email_config.get('password')
            to_email = email_config.get('to_email')
            
            if not all([smtp_server, username, password, to_email]):
                logger.warning("Email configuration incomplete, skipping email alert")
                return
            
            msg = MimeMultipart()
            msg['From'] = username
            msg['To'] = to_email
            msg['Subject'] = f"AI Job Finder Alert: {alert.title}"
            
            body = f"""
Alert Details:
- Level: {alert.level.value.upper()}
- Component: {alert.component}
- Time: {alert.timestamp.isoformat()}
- Message: {alert.message}

This is an automated alert from the AI Job Finder system.
"""
            
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Sent email alert: {alert.title}")
        
        except Exception as e:
            logger.error(f"Failed to send email alert: {str(e)}")
    
    def get_current_metrics(self) -> Optional[HealthMetrics]:
        """Get the most recent health metrics."""
        return self.metrics_history[-1] if self.metrics_history else None
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active (unresolved) alerts."""
        return [alert for alert in self.alerts if not alert.resolved]
    
    def get_alert_history(self, hours: int = 24) -> List[Alert]:
        """Get alert history for the specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [alert for alert in self.alerts if alert.timestamp > cutoff_time]
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get a summary of system health."""
        current_metrics = self.get_current_metrics()
        active_alerts = self.get_active_alerts()
        
        if not current_metrics:
            return {
                'status': HealthStatus.UNKNOWN.value,
                'message': 'No metrics available'
            }
        
        # Determine overall health
        if active_alerts:
            critical_alerts = [a for a in active_alerts if a.level == AlertLevel.CRITICAL]
            error_alerts = [a for a in active_alerts if a.level == AlertLevel.ERROR]
            
            if critical_alerts:
                overall_status = HealthStatus.UNHEALTHY
            elif error_alerts:
                overall_status = HealthStatus.DEGRADED
            else:
                overall_status = HealthStatus.HEALTHY
        else:
            overall_status = current_metrics.api_connectivity
        
        return {
            'status': overall_status.value,
            'api_connectivity': current_metrics.api_connectivity.value,
            'active_agents': current_metrics.active_agents,
            'error_rate': f"{current_metrics.error_rate:.1%}",
            'uptime': f"{current_metrics.uptime_percentage:.1f}%",
            'response_time': f"{current_metrics.average_response_time:.2f}s",
            'active_alerts': len(active_alerts),
            'last_sync': current_metrics.last_successful_sync.isoformat() if current_metrics.last_successful_sync else None
        }

# Convenience function for creating monitor
def create_monitor(api_client: NodeApiClient, config: Dict[str, Any]) -> SystemMonitor:
    """
    Create and return a configured system monitor.
    
    Args:
        api_client: API client for monitoring
        config: Monitoring configuration
        
    Returns:
        Configured SystemMonitor instance
    """
    return SystemMonitor(api_client, config)