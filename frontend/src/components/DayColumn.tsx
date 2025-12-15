/**
 * DayColumn.tsx - Individual day component with named tasks
 * 
 * Displays a single day with its named tasks (binary checkboxes or count steppers)
 */

import React from 'react';
import { formatDayHeader, isToday, TaskTemplate } from '../store/plannerStore';
import './DayColumn.css';

interface DayColumnProps {
    date: Date;
    tasks: TaskTemplate[];
    taskValues: Record<string, number>;
    onTaskChange: (taskId: string, newValue: number) => void;
}

export const DayColumn: React.FC<DayColumnProps> = ({ date, tasks, taskValues, onTaskChange }) => {
    const { weekday, dayNum } = formatDayHeader(date);
    const today = isToday(date);

    // Count completed tasks (value > 0 counts as completed)
    const completedCount = tasks.filter(t => (taskValues[t.id] || 0) > 0).length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

    return (
        <div className={`day-column ${today ? 'is-today' : ''}`}>
            <div className="day-header">
                <span className="weekday">{weekday}</span>
                <span className="day-number">{dayNum}</span>
            </div>

            <div className="tasks-container">
                {tasks.map((task) => {
                    const value = taskValues[task.id] || 0;
                    const isCount = task.type === 'count';

                    if (isCount) {
                        // Count-type task: show stepper with optional unit
                        return (
                            <div key={task.id} className={`task-item task-count ${value > 0 ? 'is-completed' : ''}`} title={task.name}>
                                <span className="task-label">{task.name}</span>
                                <div className="count-stepper">
                                    <button 
                                        className="stepper-btn minus"
                                        onClick={() => onTaskChange(task.id, value - 1)}
                                        disabled={value === 0}
                                        aria-label="Decrease"
                                    >
                                        −
                                    </button>
                                    <span className="count-value">
                                        {value}
                                        {task.unit && <span className="count-unit">{task.unit}</span>}
                                    </span>
                                    <button 
                                        className="stepper-btn plus"
                                        onClick={() => onTaskChange(task.id, value + 1)}
                                        aria-label="Increase"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    // Binary-type task: show checkbox
                    return (
                        <label key={task.id} className="task-item" title={task.name}>
                            <input
                                type="checkbox"
                                checked={value > 0}
                                onChange={() => onTaskChange(task.id, value > 0 ? 0 : 1)}
                                className="task-checkbox"
                            />
                            <span className="task-checkmark"></span>
                            <span className="task-label">{task.name}</span>
                        </label>
                    );
                })}

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
