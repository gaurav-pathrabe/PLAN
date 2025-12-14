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
    getTasksForDate
} from '../store/plannerStore';
import { LoadWeek, SaveDay, GetTaskTemplates } from '../../wailsjs/go/main/App';
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

    // Week task completion data: date -> taskId -> completed
    const [weekData, setWeekData] = useState<Map<string, Record<string, boolean>>>(new Map());
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

                setTemplates(templatesData || []);

                const newWeekData = new Map<string, Record<string, boolean>>();
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

    // Handle task toggle
    const handleTaskToggle = useCallback(async (dateKey: string, taskId: string) => {
        setWeekData(prevData => {
            const newData = new Map(prevData);
            const dayTasks = { ...newData.get(dateKey) } || {};

            dayTasks[taskId] = !dayTasks[taskId];
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
                            taskStates={taskStates}
                            onTaskToggle={(taskId) => handleTaskToggle(key, taskId)}
                        />
                    );
                })}
            </div>
        </main>
    );
};

export default WeeklyPlanner;
