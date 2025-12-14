/**
 * App.tsx - Main application component
 * 
 * A calm, time-aware weekly planner - single page dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { WeekHeader } from './components/WeekHeader';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { WeeklyReport } from './components/WeeklyReport';
import { MonthlyReport } from './components/MonthlyReport';
import { YearlyReport } from './components/YearlyReport';
import { TaskSettings } from './components/TaskSettings';
import { initializeTheme, toggleTheme, Theme } from './store/theme';
import './App.css';

function App() {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [theme, setTheme] = useState<Theme>('light');
    const [refreshKey, setRefreshKey] = useState<number>(0);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const initialTheme = initializeTheme();
        setTheme(initialTheme);
    }, []);

    const handleThemeToggle = () => {
        const newTheme = toggleTheme();
        setTheme(newTheme);
    };

    const handleDataChange = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    const handleTasksChanged = () => {
        setRefreshKey(prev => prev + 1);
    };

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    return (
        <div className="app">
            {/* Header */}
            <WeekHeader
                currentDate={currentDate}
                onChange={setCurrentDate}
            />

            {/* Toolbar */}
            <div className="toolbar">
                <button
                    className="toolbar-button"
                    onClick={() => setIsSettingsOpen(true)}
                    aria-label="Task Settings"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    <span>Tasks</span>
                </button>

                <button
                    className="toolbar-button"
                    onClick={handleThemeToggle}
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    )}
                    <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
                </button>
            </div>

            {/* Main Content - Dashboard Layout */}
            <div className="main-content">
                {/* Planner Section */}
                <WeeklyPlanner
                    currentDate={currentDate}
                    onDataChange={handleDataChange}
                    refreshKey={refreshKey}
                />

                {/* Reports Dashboard */}
                <div className="reports-dashboard">
                    {/* Top Row: Weekly + Monthly */}
                    <div className="reports-row">
                        <WeeklyReport currentDate={currentDate} refreshKey={refreshKey} />
                        <MonthlyReport year={currentYear} month={currentMonth} refreshKey={refreshKey} />
                    </div>

                    {/* Bottom Row: Yearly */}
                    <div className="reports-row">
                        <YearlyReport year={currentYear} refreshKey={refreshKey} />
                    </div>
                </div>
            </div>

            {/* Task Settings Modal */}
            <TaskSettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onTasksChanged={handleTasksChanged}
            />
        </div>
    );
}

export default App;
