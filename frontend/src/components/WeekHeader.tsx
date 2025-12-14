/**
 * WeekHeader.tsx - Week navigation header component
 * 
 * Displays the current week date range with navigation arrows
 */

import React from 'react';
import { formatWeekRange, getWeekDates } from '../store/plannerStore';
import './WeekHeader.css';

interface WeekHeaderProps {
    currentDate: Date;
    onChange: (newDate: Date) => void;
}

export const WeekHeader: React.FC<WeekHeaderProps> = ({ currentDate, onChange }) => {
    const weekDates = getWeekDates(currentDate);
    const weekRange = formatWeekRange(weekDates);

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        onChange(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        onChange(newDate);
    };

    const handleToday = () => {
        onChange(new Date());
    };

    return (
        <header className="week-header">
            <button
                className="nav-button"
                onClick={handlePrevWeek}
                aria-label="Previous week"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>

            <div className="week-info">
                <h1 className="week-range">{weekRange}</h1>
                <button className="today-button" onClick={handleToday}>
                    Today
                </button>
            </div>

            <button
                className="nav-button"
                onClick={handleNextWeek}
                aria-label="Next week"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>
        </header>
    );
};

export default WeekHeader;
