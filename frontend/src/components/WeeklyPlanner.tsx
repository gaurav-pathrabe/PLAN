/**
 * WeeklyPlanner.tsx - Main planner grid component with named tasks
 * 
 * Displays a week of days with their named tasks, synced with Go backend
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    getWeekDates,
    formatDateKey,
    getWeekStart,
    TaskTemplate,
    getTasksForDate,
    formatWeekRange
} from '../store/plannerStore';
import {
    LoadWeek,
    SaveDay,
    GetTaskTemplates,
    // Auto-export imports
    IsWeekExported,
    GetWeeklyReport,
    SaveHTMLExport,
    MarkWeekExported
} from '../../wailsjs/go/main/App';
import { generateWeeklyHTML } from '../store/exportUtils';
import { DayColumn } from './DayColumn';
import './WeeklyPlanner.css';

interface WeeklyPlannerProps {
    currentDate: Date;
    onDataChange?: () => void;
    refreshKey?: number;
}

export const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
    currentDate,
    onDataChange,
    refreshKey = 0
}) => {
    const weekDates = getWeekDates(currentDate);
    const weekStartKey = formatDateKey(getWeekStart(currentDate));

    // Task templates
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);

    // Week task completion data: date -> taskId -> value (0/1 for binary, 0-N for count)
    const [weekData, setWeekData] = useState<Map<string, Record<string, number>>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    // Load templates and week data
    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Load templates and week data in parallel
                const [templatesData, weekTaskData] = await Promise.all([
                    GetTaskTemplates(),
                    LoadWeek(weekStartKey)
                ]);

                if (cancelled) return;

                // Cast templates to local TaskTemplate type
                setTemplates(
                    (templatesData || []).map((t: any) => ({
                        ...t,
                        type: t?.type === 'count' ? 'count' : 'binary'
                    })) as TaskTemplate[]
                );

                // Store numeric values directly
                const newWeekData = new Map<string, Record<string, number>>();
                weekDates.forEach(date => {
                    const key = formatDateKey(date);
                    newWeekData.set(key, weekTaskData[key] || {});
                });

                setWeekData(newWeekData);
            } catch (error) {
                console.error('Failed to load data:', error);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, [weekStartKey, refreshKey]);

    // Auto-export logic: Check if previous week needs exporting
    useEffect(() => {
        const checkAndExportPreviousWeek = async () => {
            try {
                // Calculate previous week's start date
                const currentWeekDate = getWeekStart(currentDate);
                const prevWeekDate = new Date(currentWeekDate);
                prevWeekDate.setDate(prevWeekDate.getDate() - 7);
                const prevWeekKey = formatDateKey(prevWeekDate);

                // 1. Check if already exported
                const exported = await IsWeekExported(prevWeekKey);
                if (exported) return;

                console.log(`Auto-exporting previous week: ${prevWeekKey}`);

                // 2. Fetch report data
                const report = await GetWeeklyReport(prevWeekKey);

                // 3. Generate HTML
                const prevWeekObj = new Date(prevWeekKey);
                const prevWeekRangeStr = formatWeekRange(getWeekDates(prevWeekObj));

                const html = generateWeeklyHTML({
                    dateRange: prevWeekRangeStr,
                    dailyPercentages: report.dailyPercentages as number[] || [],
                    weeklyAverage: report.weeklyAverage as number || 0
                });

                // 4. Save to disk
                const filename = `PLAN-Weekly-${prevWeekKey}.html`;
                await SaveHTMLExport(filename, html);

                // 5. Mark as exported
                await MarkWeekExported(prevWeekKey);
                console.log(`Successfully auto-exported: ${filename}`);

            } catch (error) {
                console.error('Auto-export failed:', error);
            }
        };

        // Delay slightly to ensure app is ready
        const timer = setTimeout(() => {
            checkAndExportPreviousWeek();
        }, 2000);

        return () => clearTimeout(timer);
    }, [weekStartKey]);

    // Handle task value change (for both binary toggle and count increment/decrement)
    const handleTaskChange = useCallback(async (dateKey: string, taskId: string, newValue: number) => {
        setWeekData(prevData => {
            const newData = new Map(prevData);
            const dayTasks = { ...newData.get(dateKey) };

            dayTasks[taskId] = Math.max(0, newValue); // Ensure non-negative
            newData.set(dateKey, dayTasks);

            // Save to backend
            SaveDay(dateKey, dayTasks)
                .then(() => {
                    if (onDataChange) {
                        onDataChange();
                    }
                })
                .catch(error => {
                    console.error('Failed to save day:', error);
                });

            return newData;
        });
    }, [onDataChange]);

    return (
        <main className="weekly-planner">
            <div className={`planner-grid ${isLoading ? 'is-loading' : ''}`}>
                {weekDates.map(date => {
                    const key = formatDateKey(date);
                    const tasksForDay = getTasksForDate(templates, date);
                    const taskStates = weekData.get(key) || {};

                    return (
                        <DayColumn
                            key={key}
                            date={date}
                            tasks={tasksForDay}
                            taskValues={taskStates}
                            onTaskChange={(taskId, newValue) => handleTaskChange(key, taskId, newValue)}
                        />
                    );
                })}
            </div>
        </main>
    );
};

export default WeeklyPlanner;
