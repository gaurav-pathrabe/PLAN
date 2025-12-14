/**
 * MonthlyReport.tsx - Monthly report component with export
 * 
 * Displays weekly blocks with color intensity based on completion
 */

import React, { useState, useEffect } from 'react';
import { GetMonthlyReport } from '../../wailsjs/go/main/App';
import { exportToHTML } from '../store/exportUtils';
import './MonthlyReport.css';

interface MonthlyReportProps {
    year: number;
    month: number;
    refreshKey?: number;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ year, month, refreshKey = 0 }) => {
    const [weeklyAverages, setWeeklyAverages] = useState<number[]>([]);
    const [monthName, setMonthName] = useState<string>('');
    const [trendDirection, setTrendDirection] = useState<string>('stable');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState<string>('');

    useEffect(() => {
        let cancelled = false;

        const loadReport = async () => {
            setIsLoading(true);
            try {
                const report = await GetMonthlyReport(year, month);

                if (cancelled) return;

                setWeeklyAverages(report.weeklyAverages as number[] || []);
                setMonthName(report.monthName as string || '');
                setTrendDirection(report.trendDirection as string || 'stable');
            } catch (error) {
                console.error('Failed to load monthly report:', error);
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
    }, [year, month, refreshKey]);

    const handleExport = async () => {
        setIsExporting(true);
        setExportMessage('');
        try {
            await exportToHTML('monthly', {
                monthName,
                year,
                weeklyAverages,
                trendDirection
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

    const getTrendIcon = () => {
        switch (trendDirection) {
            case 'up': return '↗';
            case 'down': return '↘';
            default: return '→';
        }
    };

    const getOverallAverage = () => {
        if (weeklyAverages.length === 0) return 0;
        const sum = weeklyAverages.reduce((a, b) => a + b, 0);
        return Math.round(sum / weeklyAverages.length);
    };

    return (
        <div className={`monthly-report ${isLoading ? 'is-loading' : ''}`}>
            <div className="report-header">
                <h2 className="report-title">{monthName} {year}</h2>
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
                    <div className="trend-indicator">
                        <span className={`trend-icon trend-${trendDirection}`}>{getTrendIcon()}</span>
                        <span className="trend-label">{trendDirection}</span>
                    </div>
                </div>
            </div>

            {exportMessage && <div className="export-message">{exportMessage}</div>}

            <div className="weekly-blocks">
                {weeklyAverages.map((average, index) => (
                    <div
                        key={index}
                        className="week-block"
                        style={{
                            opacity: average > 0 ? 0.3 + (average / 100) * 0.7 : 0.1
                        }}
                    >
                        <span className="week-label">Week {index + 1}</span>
                        <span className="week-value">{Math.round(average)}%</span>
                    </div>
                ))}
            </div>

            <div className="month-summary">
                <span className="summary-value">{getOverallAverage()}%</span>
                <span className="summary-label">monthly average</span>
            </div>

            {weeklyAverages.length > 1 && (
                <div className="trend-line-container">
                    <svg className="trend-line" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <polyline
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={weeklyAverages.map((avg, i) => {
                                const x = (i / (weeklyAverages.length - 1)) * 100;
                                const y = 40 - (avg / 100) * 40;
                                return `${x},${y}`;
                            }).join(' ')}
                        />
                    </svg>
                </div>
            )}
        </div>
    );
};

export default MonthlyReport;
