/**
 * TaskSettings.tsx - Settings modal for managing task templates
 * 
 * Allows adding, editing, deleting, reordering tasks, and configuring export settings
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    TaskTemplate,
    getWeekDates,
    formatWeekRange,
    formatDateKey,
    getWeekStart
} from '../store/plannerStore';
import { generateWeeklyHTML } from '../store/exportUtils';
import {
    GetTaskTemplates,
    AddTask,
    UpdateTask,
    DeleteTask,
    SetTaskType,
    ReorderTasks,
    GetExportPath,
    SetExportPath,
    SelectDirectory,
    IsWeekExported,
    GetWeeklyReport,
    SaveHTMLExport,
    MarkWeekExported
} from '../../wailsjs/go/main/App';
import './TaskSettings.css';

interface TaskSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onTasksChanged: () => void;
}

interface ConfirmDialogState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

// Common emoji presets for tasks
const EMOJI_PRESETS = [
    { emoji: '🏃', label: 'Running' },
    { emoji: '💪', label: 'Gym' },
    { emoji: '💼', label: 'Work' },
    { emoji: '📚', label: 'Study' },
    { emoji: '🧘', label: 'Meditation' },
    { emoji: '💧', label: 'Water' },
    { emoji: '🥗', label: 'Healthy Eating' },
    { emoji: '😴', label: 'Sleep' },
    { emoji: '📝', label: 'Journal' },
    { emoji: '🎯', label: 'Goals' },
    { emoji: '🚶', label: 'Walk' },
    { emoji: '🧹', label: 'Clean' },
    { emoji: '💊', label: 'Vitamins' },
    { emoji: '📵', label: 'No Phone' },
    { emoji: '🎨', label: 'Creative' },
    { emoji: '🎸', label: 'Music' },
    { emoji: '🌱', label: 'Self-care' },
    { emoji: '☕', label: 'Morning' },
    { emoji: '🌙', label: 'Night Routine' },
    { emoji: '✨', label: 'Custom' }
];

// Unit presets for count tasks
const UNIT_PRESETS = [
    { value: '', label: 'None' },
    { value: 'min', label: 'Minutes' },
    { value: 'hrs', label: 'Hours' },
    { value: 'reps', label: 'Reps' },
    { value: 'sets', label: 'Sets' },
    { value: 'km', label: 'Kilometers' },
    { value: 'mi', label: 'Miles' },
    { value: 'steps', label: 'Steps' },
    { value: 'glasses', label: 'Glasses' },
    { value: 'pages', label: 'Pages' },
    { value: 'cal', label: 'Calories' },
    { value: 'custom', label: 'Custom...' }
];

export const TaskSettings: React.FC<TaskSettingsProps> = ({ isOpen, onClose, onTasksChanged }) => {
    const [tasks, setTasks] = useState<TaskTemplate[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskType, setNewTaskType] = useState<'binary' | 'count'>('binary');
    const [selectedEmoji, setSelectedEmoji] = useState<string>('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [customUnit, setCustomUnit] = useState<string>('');
    const [showCustomUnit, setShowCustomUnit] = useState(false);
    const [exportPath, setExportPath] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isExportingHistory, setIsExportingHistory] = useState(false);
    const [exportStatus, setExportStatus] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });
    const editInputRef = useRef<HTMLInputElement>(null);
    const newInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadTasks();
        }
    }, [isOpen]);

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    useEffect(() => {
        if (isAdding && newInputRef.current) {
            newInputRef.current.focus();
        }
    }, [isAdding]);

    const loadTasks = async () => {
        try {
            const templates = await GetTaskTemplates();
            setTasks(
                (templates || []).map((t: any) => ({
                    ...t,
                    type: t?.type === 'count' ? 'count' : 'binary'
                }))
            );

            const path = await GetExportPath();
            setExportPath(path || 'Downloads/PLAN_Exports (Default)');
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    };

    const handleSelectExportPath = async () => {
        try {
            const path = await SelectDirectory();
            if (path) {
                await SetExportPath(path);
                setExportPath(path);
            }
        } catch (error) {
            console.error('Failed to select directory:', error);
        }
    };

    const handleExportHistory = async () => {
        if (isExportingHistory) return;

        setIsExportingHistory(true);
        setExportStatus('Starting export...');

        try {
            const today = new Date();
            let exportedCount = 0;

            // Go back 52 weeks
            for (let i = 1; i <= 52; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - (i * 7));

                const weekStart = getWeekStart(d);
                const weekKey = formatDateKey(weekStart);

                // Check if exported
                const isExported = await IsWeekExported(weekKey);
                if (!isExported) {
                    setExportStatus(`Exporting week of ${weekKey}...`);

                    // Fetch and export
                    const report = await GetWeeklyReport(weekKey);

                    // Only export if there is data (check if weeklyAverage > 0 or explicit check)
                    if (report.weeklyAverage > 0 || (report.dailyPercentages && (report.dailyPercentages as number[]).some(p => p > 0))) {
                        const rangeStr = formatWeekRange(getWeekDates(weekStart));
                        const html = generateWeeklyHTML({
                            dateRange: rangeStr,
                            dailyPercentages: report.dailyPercentages as number[] || [],
                            weeklyAverage: report.weeklyAverage as number || 0
                        });

                        const filename = `PLAN-Weekly-${weekKey}.html`;
                        await SaveHTMLExport(filename, html);
                        await MarkWeekExported(weekKey);
                        exportedCount++;
                    }
                }
            }

            setExportStatus(`Export complete. ${exportedCount} reports generated.`);
            setTimeout(() => setExportStatus(''), 3000);

        } catch (error) {
            console.error('Export history failed:', error);
            setExportStatus('Export failed.');
        } finally {
            setIsExportingHistory(false);
        }
    };

    const handleStartEdit = (task: TaskTemplate) => {
        setEditingId(task.id);
        setEditingName(task.name);
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editingName.trim()) {
            setEditingId(null);
            return;
        }

        try {
            await UpdateTask(editingId, editingName.trim());
            await loadTasks();
            onTasksChanged();
        } catch (error) {
            console.error('Failed to update task:', error);
        }

        setEditingId(null);
        setEditingName('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const showDeleteConfirmation = (task: TaskTemplate) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Task',
            message: `Are you sure you want to delete "${task.name}"? This will remove it from today and all future dates. Past data will be preserved.`,
            onConfirm: async () => {
                try {
                    await DeleteTask(task.id);
                    await loadTasks();
                    onTasksChanged();
                } catch (error) {
                    console.error('Failed to delete task:', error);
                }
                closeConfirmDialog();
            }
        });
    };

    const showAddConfirmation = () => {
        if (!newTaskName.trim()) {
            setIsAdding(false);
            return;
        }

        const taskNameWithEmoji = selectedEmoji 
            ? `${selectedEmoji} ${newTaskName.trim()}` 
            : newTaskName.trim();

        // Determine final unit value
        const finalUnit = showCustomUnit ? customUnit.trim() : selectedUnit;
        const unitDisplay = finalUnit ? ` (${finalUnit})` : '';

        setConfirmDialog({
            isOpen: true,
            title: 'Add Task',
            message: `Add "${taskNameWithEmoji}${unitDisplay}" as a new ${newTaskType === 'count' ? 'count' : 'checkbox'} habit? This will appear for today and all future dates.`,
            onConfirm: async () => {
                try {
                    await AddTask(taskNameWithEmoji, newTaskType, finalUnit);
                    await loadTasks();
                    onTasksChanged();
                    setNewTaskName('');
                    setNewTaskType('binary');
                    setSelectedEmoji('');
                    setShowEmojiPicker(false);
                    setSelectedUnit('');
                    setCustomUnit('');
                    setShowCustomUnit(false);
                    setIsAdding(false);
                } catch (error) {
                    console.error('Failed to add task:', error);
                }
                closeConfirmDialog();
            }
        });
    };

    const closeConfirmDialog = () => {
        setConfirmDialog({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: () => { }
        });
    };

    const handleMoveUp = async (index: number) => {
        if (index === 0) return;

        const newOrder = [...tasks];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

        try {
            await ReorderTasks(newOrder.map(t => t.id));
            await loadTasks();
            onTasksChanged();
        } catch (error) {
            console.error('Failed to reorder tasks:', error);
        }
    };

    const handleMoveDown = async (index: number) => {
        if (index === tasks.length - 1) return;

        const newOrder = [...tasks];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

        try {
            await ReorderTasks(newOrder.map(t => t.id));
            await loadTasks();
            onTasksChanged();
        } catch (error) {
            console.error('Failed to reorder tasks:', error);
        }
    };

    const handleToggleType = async (task: TaskTemplate) => {
        const currentType = task.type === 'count' ? 'count' : 'binary';
        const nextType = currentType === 'binary' ? 'count' : 'binary';

        try {
            await SetTaskType(task.id, nextType);
            await loadTasks();
            onTasksChanged();
        } catch (error) {
            console.error('Failed to update task type:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, action: 'edit' | 'add') => {
        if (e.key === 'Enter') {
            if (action === 'edit') {
                handleSaveEdit();
            } else {
                showAddConfirmation();
            }
        } else if (e.key === 'Escape') {
            if (action === 'edit') {
                handleCancelEdit();
            } else {
                setIsAdding(false);
                setNewTaskName('');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="task-settings-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Task Setup</h2>
                    <button className="close-button" onClick={onClose} aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </header>

                <div className="modal-content">
                    <p className="settings-description">
                        Add, edit, or remove your daily tasks. Changes to tasks will only affect today and future dates.
                    </p>

                    <div className="task-list">
                        {tasks.map((task, index) => (
                            <div key={task.id} className="task-item">
                                {editingId === task.id ? (
                                    <div className="task-edit-row">
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            value={editingName}
                                            onChange={e => setEditingName(e.target.value)}
                                            onKeyDown={e => handleKeyDown(e, 'edit')}
                                            onBlur={handleSaveEdit}
                                            className="task-input"
                                            placeholder="Task name"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="task-order-controls">
                                            <button
                                                className="order-button"
                                                onClick={() => handleMoveUp(index)}
                                                disabled={index === 0}
                                                aria-label="Move up"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="18 15 12 9 6 15"></polyline>
                                                </svg>
                                            </button>
                                            <button
                                                className="order-button"
                                                onClick={() => handleMoveDown(index)}
                                                disabled={index === tasks.length - 1}
                                                aria-label="Move down"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </button>
                                        </div>

                                        <span className="task-name">{task.name}</span>

                                        <div className="task-actions">
                                            <button
                                                className="action-button type"
                                                onClick={() => handleToggleType(task)}
                                                aria-label={`Switch ${task.name} to ${task.type === 'count' ? 'checkbox' : 'count'} habit`}
                                                title={task.type === 'count' ? 'Count habit' : 'Checkbox habit'}
                                            >
                                                {task.type === 'count' ? (
                                                    <span className="type-chip">#</span>
                                                ) : (
                                                    <span className="type-chip">✓</span>
                                                )}
                                            </button>
                                            <button
                                                className="action-button edit"
                                                onClick={() => handleStartEdit(task)}
                                                aria-label="Edit task"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                            <button
                                                className="action-button delete"
                                                onClick={() => showDeleteConfirmation(task)}
                                                aria-label="Delete task"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {isAdding ? (
                        <div className="add-task-form animate-pop-in">
                            <div className="type-toggle">
                                <button
                                    type="button"
                                    className={`type-toggle-button ${newTaskType === 'binary' ? 'is-active' : ''}`}
                                    onClick={() => setNewTaskType('binary')}
                                >
                                    Checkbox
                                </button>
                                <button
                                    type="button"
                                    className={`type-toggle-button ${newTaskType === 'count' ? 'is-active' : ''}`}
                                    onClick={() => setNewTaskType('count')}
                                >
                                    Count
                                </button>
                            </div>
                            
                            {/* Emoji Picker */}
                            <div className="emoji-picker-section">
                                <button 
                                    type="button"
                                    className={`emoji-trigger ${selectedEmoji ? 'has-emoji' : ''}`}
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    {selectedEmoji || '😊'}
                                    <span className="emoji-label">{selectedEmoji ? 'Change' : 'Add Icon'}</span>
                                </button>
                                
                                {showEmojiPicker && (
                                    <div className="emoji-picker animate-pop-in">
                                        <div className="emoji-grid">
                                            {EMOJI_PRESETS.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className={`emoji-option ${selectedEmoji === item.emoji ? 'is-selected' : ''}`}
                                                    onClick={() => {
                                                        setSelectedEmoji(item.emoji);
                                                        setShowEmojiPicker(false);
                                                    }}
                                                    title={item.label}
                                                >
                                                    {item.emoji}
                                                </button>
                                            ))}
                                        </div>
                                        {selectedEmoji && (
                                            <button 
                                                type="button" 
                                                className="emoji-clear"
                                                onClick={() => {
                                                    setSelectedEmoji('');
                                                    setShowEmojiPicker(false);
                                                }}
                                            >
                                                Remove Icon
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Unit Selector (only for count type) */}
                            {newTaskType === 'count' && (
                                <div className="unit-selector-section animate-pop-in">
                                    <label className="unit-label">Unit (optional)</label>
                                    <div className="unit-grid">
                                        {UNIT_PRESETS.map((item) => (
                                            <button
                                                key={item.value}
                                                type="button"
                                                className={`unit-option ${
                                                    (item.value === 'custom' && showCustomUnit) || 
                                                    (!showCustomUnit && selectedUnit === item.value) 
                                                        ? 'is-selected' 
                                                        : ''
                                                }`}
                                                onClick={() => {
                                                    if (item.value === 'custom') {
                                                        setShowCustomUnit(true);
                                                        setSelectedUnit('');
                                                    } else {
                                                        setShowCustomUnit(false);
                                                        setCustomUnit('');
                                                        setSelectedUnit(item.value);
                                                    }
                                                }}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                    {showCustomUnit && (
                                        <input
                                            type="text"
                                            value={customUnit}
                                            onChange={e => setCustomUnit(e.target.value)}
                                            className="task-input custom-unit-input"
                                            placeholder="Enter custom unit (e.g., laps, books)"
                                            maxLength={15}
                                        />
                                    )}
                                </div>
                            )}
                            
                            <div className="task-input-wrapper">
                                {selectedEmoji && <span className="input-emoji-preview">{selectedEmoji}</span>}
                                <input
                                    ref={newInputRef}
                                    type="text"
                                    value={newTaskName}
                                    onChange={e => setNewTaskName(e.target.value)}
                                    onKeyDown={e => handleKeyDown(e, 'add')}
                                    className={`task-input ${selectedEmoji ? 'has-emoji' : ''}`}
                                    placeholder="Enter task name..."
                                />
                            </div>
                            <div className="add-task-actions">
                                <button className="btn-secondary" onClick={() => { setIsAdding(false); setNewTaskName(''); setSelectedEmoji(''); setShowEmojiPicker(false); setSelectedUnit(''); setCustomUnit(''); setShowCustomUnit(false); }}>
                                    Cancel
                                </button>
                                <button className="btn-primary" onClick={showAddConfirmation}>
                                    Add Task
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="add-task-button" onClick={() => setIsAdding(true)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add New Task
                        </button>
                    )}

                    <div className="settings-section">
                        <h3 className="section-title">Export Location</h3>
                        <div className="export-setting">
                            <div className="path-display" title={exportPath}>
                                {exportPath}
                            </div>
                            <button className="btn-secondary" onClick={handleSelectExportPath}>
                                Change Folder
                            </button>
                        </div>

                        <div className="export-actions" style={{ marginTop: '1rem' }}>
                            <button
                                className="btn-secondary"
                                onClick={handleExportHistory}
                                disabled={isExportingHistory}
                                style={{ width: '100%' }}
                            >
                                {isExportingHistory ? 'Exporting...' : 'Export All Past Weeks'}
                            </button>
                            {exportStatus && <div className="export-status-text">{exportStatus}</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {confirmDialog.isOpen && (
                <div className="confirm-overlay" onClick={closeConfirmDialog}>
                    <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                        <h3 className="confirm-title">{confirmDialog.title}</h3>
                        <p className="confirm-message">{confirmDialog.message}</p>
                        <div className="confirm-actions">
                            <button className="btn-secondary" onClick={closeConfirmDialog}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={confirmDialog.onConfirm}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskSettings;
