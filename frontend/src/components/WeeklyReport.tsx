/**
 * WeeklyReport.tsx - Weekly report component with bar chart
 * 
 * Displays daily completion percentages as a calm bar chart
 */

import React, { useState, useEffect } from 'react';
import { formatDateKey, getWeekStart } from '../store/plannerStore';
import { GetWeeklyReport } from '../../wailsjs/go/main/App';
import './WeeklyReport.css';

interface WeeklyReportProps {
    currentDate: Date;
    refreshKey?: number; // Changes when data is updated
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ currentDate, refreshKey = 0 }) => {
    const [dailyPercentages, setDailyPercentages] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [weeklyAverage, setWeeklyAverage] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    const weekStartKey = formatDateKey(getWeekStart(currentDate));

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
    }, [weekStartKey, refreshKey]); // Re-fetch when refreshKey changes

    return (
        <div className={`weekly-report ${isLoading ? 'is-loading' : ''}`}>
            <div className="report-header">
                <h2 className="report-title">Weekly Progress</h2>
                <div className="weekly-average">
                    <span className="average-value">{Math.round(weeklyAverage)}%</span>
                    <span className="average-label">average</span>
                </div>
            </div>

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
