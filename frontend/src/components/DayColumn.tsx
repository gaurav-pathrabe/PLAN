/**
 * DayColumn.tsx - Individual day component with named tasks
 * 
 * Displays a single day with its named tasks
 */

import React from 'react';
import { formatDayHeader, isToday, TaskTemplate } from '../store/plannerStore';
import './DayColumn.css';

interface DayColumnProps {
    date: Date;
    tasks: TaskTemplate[];
    taskStates: Record<string, boolean>;
    onTaskToggle: (taskId: string) => void;
}

export const DayColumn: React.FC<DayColumnProps> = ({ date, tasks, taskStates, onTaskToggle }) => {
    const { weekday, dayNum } = formatDayHeader(date);
    const today = isToday(date);

    const completedCount = tasks.filter(t => taskStates[t.id]).length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

    return (
        <div className={`day-column ${today ? 'is-today' : ''}`}>
            <div className="day-header">
                <span className="weekday">{weekday}</span>
                <span className="day-number">{dayNum}</span>
            </div>

            <div className="tasks-container">
                {tasks.map((task) => (
                    <label key={task.id} className="task-item" title={task.name}>
                        <input
                            type="checkbox"
                            checked={taskStates[task.id] || false}
                            onChange={() => onTaskToggle(task.id)}
                            className="task-checkbox"
                        />
                        <span className="task-checkmark"></span>
                        <span className="task-label">{task.name}</span>
                    </label>
                ))}

                {tasks.length === 0 && (
                    <div className="no-tasks">
                        <span>No tasks</span>
                    </div>
                )}
            </div>

            {totalTasks > 0 && (
                <div className="day-progress">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            )}

            {totalTasks > 0 && (
                <div className="day-stats">
                    <span className="stats-text">{completedCount}/{totalTasks}</span>
                </div>
            )}
        </div>
    );
};

export default DayColumn;
