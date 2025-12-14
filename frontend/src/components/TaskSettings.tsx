/**
 * TaskSettings.tsx - Settings modal for managing task templates
 * 
 * Allows adding, editing, deleting, and reordering tasks with confirmations
 */

import React, { useState, useEffect, useRef } from 'react';
import { TaskTemplate } from '../store/plannerStore';
import {
    GetTaskTemplates,
    AddTask,
    UpdateTask,
    DeleteTask,
    ReorderTasks
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

export const TaskSettings: React.FC<TaskSettingsProps> = ({ isOpen, onClose, onTasksChanged }) => {
    const [tasks, setTasks] = useState<TaskTemplate[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [newTaskName, setNewTaskName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
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
            setTasks(templates || []);
        } catch (error) {
            console.error('Failed to load tasks:', error);
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

        setConfirmDialog({
            isOpen: true,
            title: 'Add Task',
            message: `Add "${newTaskName.trim()}" as a new daily task? This will appear for today and all future dates.`,
            onConfirm: async () => {
                try {
                    await AddTask(newTaskName.trim());
                    await loadTasks();
                    onTasksChanged();
                    setNewTaskName('');
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
                        <div className="add-task-form">
                            <input
                                ref={newInputRef}
                                type="text"
                                value={newTaskName}
                                onChange={e => setNewTaskName(e.target.value)}
                                onKeyDown={e => handleKeyDown(e, 'add')}
                                className="task-input"
                                placeholder="Enter task name..."
                            />
                            <div className="add-task-actions">
                                <button className="btn-secondary" onClick={() => { setIsAdding(false); setNewTaskName(''); }}>
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
