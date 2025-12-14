/**
 * YearlyReport.tsx - Yearly report component with export
 * 
 * Displays 12-bar chart (Jan–Dec) with most consistent month highlight
 */

import React, { useState, useEffect } from 'react';
import { GetYearlyReport } from '../../wailsjs/go/main/App';
import { exportToHTML } from '../store/exportUtils';
import './YearlyReport.css';

interface YearlyReportProps {
    year: number;
    refreshKey?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const YearlyReport: React.FC<YearlyReportProps> = ({ year, refreshKey = 0 }) => {
    const [monthlyAverages, setMonthlyAverages] = useState<number[]>(new Array(12).fill(0));
    const [mostConsistentMonth, setMostConsistentMonth] = useState<number>(0);
    const [yearTotal, setYearTotal] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState<string>('');

    useEffect(() => {
        let cancelled = false;

        const loadReport = async () => {
            setIsLoading(true);
            try {
                const report = await GetYearlyReport(year);

                if (cancelled) return;

                setMonthlyAverages(report.monthlyAverages as number[] || new Array(12).fill(0));
                setMostConsistentMonth(report.mostConsistentMonth as number || 0);
                setYearTotal(report.yearTotal as number || 0);
            } catch (error) {
                console.error('Failed to load yearly report:', error);
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
    }, [year, refreshKey]);

    const handleExport = async () => {
        setIsExporting(true);
        setExportMessage('');
        try {
            await exportToHTML('yearly', {
                year,
                monthlyAverages,
                mostConsistentMonth,
                yearTotal
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

    const hasAnyData = monthlyAverages.some(avg => avg > 0);

    return (
        <div className={`yearly-report ${isLoading ? 'is-loading' : ''}`}>
            <div className="report-header">
                <h2 className="report-title">{year} Overview</h2>
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
                    <div className="year-summary">
                        <span className="year-value">{Math.round(yearTotal)}%</span>
                        <span className="year-label">yearly average</span>
                    </div>
                </div>
            </div>

            {exportMessage && <div className="export-message">{exportMessage}</div>}

            <div className="months-chart">
                {monthlyAverages.map((average, index) => {
                    const isConsistent = hasAnyData && index === mostConsistentMonth && average > 0;

                    return (
                        <div
                            key={index}
                            className={`month-bar-wrapper ${isConsistent ? 'is-consistent' : ''}`}
                        >
                            <div className="month-bar-track">
                                <div
                                    className="month-bar-fill"
                                    style={{ height: `${average}%` }}
                                >
                                    {average > 15 && (
                                        <span className="month-bar-value">{Math.round(average)}%</span>
                                    )}
                                </div>
                            </div>
                            <span className="month-label">{MONTHS[index]}</span>
                            {isConsistent && (
                                <span className="consistent-badge" title="Most consistent">★</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {hasAnyData && (
                <div className="perspective-note">
                    {monthlyAverages[mostConsistentMonth] > 0 && (
                        <p>
                            <strong>{MONTHS[mostConsistentMonth]}</strong> was your most consistent month
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default YearlyReport;
