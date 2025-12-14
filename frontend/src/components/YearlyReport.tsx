/**
 * YearlyReport.tsx - Yearly report component
 * 
 * Displays 12-bar chart (Jan–Dec) with most consistent month highlight
 */

import React, { useState, useEffect } from 'react';
import { GetYearlyReport } from '../../wailsjs/go/main/App';
import './YearlyReport.css';

interface YearlyReportProps {
    year: number;
    refreshKey?: number; // Changes when data is updated
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const YearlyReport: React.FC<YearlyReportProps> = ({ year, refreshKey = 0 }) => {
    const [monthlyAverages, setMonthlyAverages] = useState<number[]>(new Array(12).fill(0));
    const [mostConsistentMonth, setMostConsistentMonth] = useState<number>(0);
    const [yearTotal, setYearTotal] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

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
    }, [year, refreshKey]); // Re-fetch when refreshKey changes

    const hasAnyData = monthlyAverages.some(avg => avg > 0);

    return (
        <div className={`yearly-report ${isLoading ? 'is-loading' : ''}`}>
            <div className="report-header">
                <h2 className="report-title">{year}</h2>
                <div className="year-summary">
                    <span className="year-value">{Math.round(yearTotal)}%</span>
                    <span className="year-label">yearly average</span>
                </div>
            </div>

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
