import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgentScheduleSettings from '@/components/settings/AgentScheduleSettings';
import { UserSettings } from '@/lib/types';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

const mockAgentSchedule: UserSettings['agentSchedule'] = {
  frequency: 'daily',
  enabled: true
};

describe('AgentScheduleSettings', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders agent schedule section', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    expect(screen.getByText('Agent Schedule')).toBeInTheDocument();
    expect(screen.getByText('Enable automatic job discovery')).toBeInTheDocument();
    expect(screen.getByText('Search Frequency')).toBeInTheDocument();
  });

  it('displays current enabled state', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    const enabledCheckbox = screen.getByLabelText('Enable automatic job discovery');
    expect(enabledCheckbox).toBeChecked();
  });

  it('displays current frequency selection', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    const dailyRadio = screen.getByDisplayValue('daily');
    expect(dailyRadio).toBeChecked();
  });

  it('toggles enabled state when checkbox is clicked', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    const enabledCheckbox = screen.getByLabelText('Enable automatic job discovery');
    fireEvent.click(enabledCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockAgentSchedule,
      enabled: false
    });
  });

  it('changes frequency when radio button is selected', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    const hourlyRadio = screen.getByDisplayValue('hourly');
    fireEvent.click(hourlyRadio);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockAgentSchedule,
      frequency: 'hourly'
    });
  });

  it('disables frequency options when agent is disabled', () => {
    const disabledSchedule = { ...mockAgentSchedule, enabled: false };
    render(<AgentScheduleSettings agentSchedule={disabledSchedule} onChange={mockOnChange} />);

    const hourlyRadio = screen.getByDisplayValue('hourly');
    const dailyRadio = screen.getByDisplayValue('daily');
    const weeklyRadio = screen.getByDisplayValue('weekly');

    expect(hourlyRadio).toBeDisabled();
    expect(dailyRadio).toBeDisabled();
    expect(weeklyRadio).toBeDisabled();
  });

  it('shows all frequency options', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    expect(screen.getByText('Every Hour')).toBeInTheDocument();
    expect(screen.getByText('Check for new jobs every hour')).toBeInTheDocument();
    
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Check for new jobs once per day')).toBeInTheDocument();
    
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Check for new jobs once per week')).toBeInTheDocument();
  });

  it('shows how it works information', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('The AI agent will search job boards based on your criteria')).toBeInTheDocument();
    expect(screen.getByText('New jobs will be automatically scored for relevance')).toBeInTheDocument();
    expect(screen.getByText("You'll be notified of high-quality matches")).toBeInTheDocument();
    expect(screen.getByText('All discovered jobs appear in your dashboard')).toBeInTheDocument();
  });

  it('shows current status when enabled', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    expect(screen.getByText('Current Status')).toBeInTheDocument();
    expect(screen.getByText('Agent is enabled - Running daily')).toBeInTheDocument();
  });

  it('shows current status when disabled', () => {
    const disabledSchedule = { ...mockAgentSchedule, enabled: false };
    render(<AgentScheduleSettings agentSchedule={disabledSchedule} onChange={mockOnChange} />);

    expect(screen.getByText('Agent is disabled')).toBeInTheDocument();
  });

  it('shows green indicator when enabled', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    const indicator = document.querySelector('.bg-green-400');
    expect(indicator).toBeInTheDocument();
  });

  it('shows gray indicator when disabled', () => {
    const disabledSchedule = { ...mockAgentSchedule, enabled: false };
    render(<AgentScheduleSettings agentSchedule={disabledSchedule} onChange={mockOnChange} />);

    const indicator = document.querySelector('.bg-gray-400');
    expect(indicator).toBeInTheDocument();
  });

  it('shows helpful description text', () => {
    render(<AgentScheduleSettings agentSchedule={mockAgentSchedule} onChange={mockOnChange} />);

    expect(screen.getByText('When enabled, the AI agent will automatically search for new jobs based on your criteria')).toBeInTheDocument();
  });

  it('handles different frequency values correctly', () => {
    const weeklySchedule = { ...mockAgentSchedule, frequency: 'weekly' as const };
    render(<AgentScheduleSettings agentSchedule={weeklySchedule} onChange={mockOnChange} />);

    const weeklyRadio = screen.getByDisplayValue('weekly');
    expect(weeklyRadio).toBeChecked();

    expect(screen.getByText('Agent is enabled - Running weekly')).toBeInTheDocument();
  });

  it('applies disabled styling to frequency options when agent is disabled', () => {
    const disabledSchedule = { ...mockAgentSchedule, enabled: false };
    render(<AgentScheduleSettings agentSchedule={disabledSchedule} onChange={mockOnChange} />);

    // Check that text has disabled styling
    const frequencyLabels = screen.getAllByText(/Every Hour|Daily|Weekly/);
    frequencyLabels.forEach(label => {
      expect(label).toHaveClass('text-gray-400');
    });
  });
});