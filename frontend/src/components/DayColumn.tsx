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
    taskStates: Record<string, number>;
    onBinaryToggle: (taskId: string) => void;
    onCountDelta: (taskId: string, delta: number) => void;
}

export const DayColumn: React.FC<DayColumnProps> = ({
    date,
    tasks,
    taskStates,
    onBinaryToggle,
    onCountDelta
}) => {
    const { weekday, dayNum } = formatDayHeader(date);
    const today = isToday(date);

    const completedCount = tasks.filter(t => (taskStates[t.id] ?? 0) > 0).length;
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
                    task.type === 'count' ? (
                        <div key={task.id} className="task-item count-task" title={task.name}>
                            <button
                                type="button"
                                className="count-button"
                                onClick={() => onCountDelta(task.id, -1)}
                                aria-label={`Decrease ${task.name}`}
                            >
                                −
                            </button>
                            <span className="count-value" aria-label={`${task.name} count`}>
                                {Math.max(0, taskStates[task.id] ?? 0)}
                            </span>
                            <button
                                type="button"
                                className="count-button"
                                onClick={() => onCountDelta(task.id, +1)}
                                aria-label={`Increase ${task.name}`}
                            >
                                +
                            </button>
                            <span className="task-label">{task.name}</span>
                        </div>
                    ) : (
                        <label key={task.id} className="task-item" title={task.name}>
                            <input
                                type="checkbox"
                                checked={(taskStates[task.id] ?? 0) > 0}
                                onChange={() => onBinaryToggle(task.id)}
                                className="task-checkbox"
                            />
                            <span className="task-checkmark"></span>
                            <span className="task-label">{task.name}</span>
                        </label>
                    )
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
