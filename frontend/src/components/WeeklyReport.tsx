/**
 * WeeklyReport.tsx - Weekly report component with bar chart and export
 * 
 * Displays daily completion percentages as a calm bar chart
 */

import React, { useState, useEffect } from 'react';
import { formatDateKey, getWeekStart, formatWeekRange, getWeekDates } from '../store/plannerStore';
import { GetWeeklyReport } from '../../wailsjs/go/main/App';
import { exportToHTML } from '../store/exportUtils';
import './WeeklyReport.css';

interface WeeklyReportProps {
    currentDate: Date;
    refreshKey?: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ currentDate, refreshKey = 0 }) => {
    const [dailyPercentages, setDailyPercentages] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [weeklyAverage, setWeeklyAverage] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState<string>('');

    const weekStartKey = formatDateKey(getWeekStart(currentDate));
    const dateRange = formatWeekRange(getWeekDates(currentDate));

    useEffect(() => {
        let cancelled = false;

        const loadReport = async () => {
            setIsLoading(true);
            try {
                const report = await GetWeeklyReport(weekStartKey);

                if (cancelled) return;

                setDailyPercentages(report.dailyPercentages as number[] || [0, 0, 0, 0, 0, 0, 0]);
                setWeeklyAverage(report.weeklyAverage as number || 0);
            } catch (error) {
                console.error('Failed to load weekly report:', error);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadReport();

        return () => {
            cancelled = true;
        };
    }, [weekStartKey, refreshKey]);

    const handleExport = async () => {
        setIsExporting(true);
        setExportMessage('');
        try {
            const path = await exportToHTML('weekly', {
                dateRange,
                dailyPercentages,
                weeklyAverage
            });
            setExportMessage(`Saved to Downloads`);
            setTimeout(() => setExportMessage(''), 3000);
        } catch (error) {
            console.error('Export failed:', error);
            setExportMessage('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={`weekly-report ${isLoading ? 'is-loading' : ''}`}>
            <div className="report-header">
                <h2 className="report-title">Weekly Progress</h2>
                <div className="header-right">
                    <button
                        className="export-button"
                        onClick={handleExport}
                        disabled={isExporting}
                        title="Export to HTML"
                    >
                        {isExporting ? '...' : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        )}
                    </button>
                    <div className="weekly-average">
                        <span className="average-value">{Math.round(weeklyAverage)}%</span>
                        <span className="average-label">average</span>
                    </div>
                </div>
            </div>

            {exportMessage && <div className="export-message">{exportMessage}</div>}

            <div className="chart-container">
                <div className="bars">
                    {dailyPercentages.map((percentage, index) => (
                        <div key={index} className="bar-wrapper">
                            <div className="bar-track">
                                <div
                                    className="bar-fill"
                                    style={{ height: `${percentage}%` }}
                                >
                                    {percentage > 0 && (
                                        <span className="bar-value">{Math.round(percentage)}%</span>
                                    )}
                                </div>
                            </div>
                            <span className="bar-label">{WEEKDAYS[index]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeeklyReport;
