'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import ChatComponent from './ChatComponent'
import { CheckCircle2, Circle, LayoutDashboard, Video, Clock, Calendar, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

interface StaffDashboardProps {
    user: User
}

interface Task {
    id: string
    title: string
    description?: string
    is_complete: boolean
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    type: 'task' | 'meeting'
    meeting_link?: string
    created_by: string
}

interface Profile {
    id: string
    email: string
    role: string
}

export default function StaffDashboard({ user }: StaffDashboardProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [admin, setAdmin] = useState<Profile | null>(null)
    const [activeTab, setActiveTab] = useState<'global' | 'dm'>('global')
    const [expandedTask, setExpandedTask] = useState<string | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)

    // New Item Form State
    const [newItemType, setNewItemType] = useState<'task' | 'meeting'>('task')
    const [newItemTitle, setNewItemTitle] = useState('')
    const [newItemDesc, setNewItemDesc] = useState('')
    const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high'>('medium')
    const [newItemDate, setNewItemDate] = useState('')
    const [newItemLink, setNewItemLink] = useState('')

    const supabase = createClient()

    useEffect(() => {
        fetchTasks()
        fetchAdmin()

        const channel = supabase
            .channel(`my-tasks-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `assignee_id=eq.${user.id}`,
                },
                () => {
                    fetchTasks()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user.id])

    const fetchTasks = async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('assignee_id', user.id)
            .order('is_complete', { ascending: true })
            .order('due_date', { ascending: true })
        if (data) setTasks(data)
    }

    const fetchAdmin = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'admin')
            .limit(1)
            .single()
        if (data) setAdmin(data)
    }

    const toggleTask = async (taskId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus
        setTasks(tasks.map(t => t.id === taskId ? { ...t, is_complete: newStatus } : t))

        if (newStatus) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })
        }

        const { error } = await supabase
            .from('tasks')
            .update({ is_complete: newStatus })
            .eq('id', taskId)

        if (error) fetchTasks()
    }

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newItemTitle.trim()) return

        const { error } = await supabase.from('tasks').insert({
            title: newItemTitle,
            description: newItemDesc,
            priority: newItemPriority,
            due_date: newItemDate ? new Date(newItemDate).toISOString() : null,
            type: newItemType,
            meeting_link: newItemLink,
            assignee_id: user.id, // Assign to self
            created_by: user.id,  // Created by self
        })

        if (!error) {
            setNewItemTitle('')
            setNewItemDesc('')
            setNewItemDate('')
            setNewItemLink('')
            setShowAddForm(false)
            fetchTasks()
        } else {
            console.error('Error creating task:', error)
            alert('Failed to create task. Make sure you have run the schema_staff_tasks.sql update.')
        }
    }

    const handleDeleteTask = async (taskId: string, createdBy: string) => {
        // Only allow deleting tasks created by self
        if (createdBy !== user.id) {
            alert('You can only delete tasks you created yourself.')
            return
        }

        await supabase.from('tasks').delete().eq('id', taskId)
        fetchTasks()
    }

    const addToGoogleCalendar = (task: Task) => {
        if (!task.due_date) return

        const startTime = new Date(task.due_date).toISOString().replace(/-|:|\.\d\d\d/g, "")
        const endTime = new Date(new Date(task.due_date).getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "")

        const url = new URL('https://calendar.google.com/calendar/render')
        url.searchParams.append('action', 'TEMPLATE')
        url.searchParams.append('text', task.title)
        url.searchParams.append('details', task.description || '')
        url.searchParams.append('dates', `${startTime}/${endTime}`)
        if (task.meeting_link) {
            url.searchParams.append('location', task.meeting_link)
        }

        window.open(url.toString(), '_blank')
    }

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20'
            case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
            default: return 'text-slate-400'
        }
    }

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 h-[calc(100vh-8rem)]">
            {/* Task List */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col glass-card rounded-2xl p-8"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <LayoutDashboard className="text-indigo-400" />
                        My Workspace
                    </h2>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="rounded-full bg-indigo-600/20 p-2 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Add Item Form */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.form
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleAddItem}
                            className="mb-6 space-y-4 overflow-hidden rounded-xl bg-slate-800/30 p-4 border border-slate-700/50"
                        >
                            <div className="flex gap-4 border-b border-slate-700/50 pb-3">
                                <button
                                    type="button"
                                    onClick={() => setNewItemType('task')}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${newItemType === 'task' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <CheckCircle2 size={16} /> Task
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewItemType('meeting')}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${newItemType === 'meeting' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Video size={16} /> Meeting
                                </button>
                            </div>

                            <div className="grid gap-3">
                                <input
                                    type="text"
                                    value={newItemTitle}
                                    onChange={(e) => setNewItemTitle(e.target.value)}
                                    placeholder={newItemType === 'task' ? "Task title..." : "Meeting title..."}
                                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                                    required
                                />

                                <div className="flex gap-3">
                                    <select
                                        value={newItemPriority}
                                        onChange={(e) => setNewItemPriority(e.target.value as any)}
                                        className="glass-input rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="low">Low Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="high">High Priority</option>
                                    </select>

                                    <input
                                        type="datetime-local"
                                        value={newItemDate}
                                        onChange={(e) => setNewItemDate(e.target.value)}
                                        className="glass-input flex-1 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>

                                {newItemType === 'meeting' && (
                                    <input
                                        type="url"
                                        value={newItemLink}
                                        onChange={(e) => setNewItemLink(e.target.value)}
                                        placeholder="Meeting Link (Google Meet, Zoom...)"
                                        className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                                    />
                                )}

                                <textarea
                                    value={newItemDesc}
                                    onChange={(e) => setNewItemDesc(e.target.value)}
                                    placeholder="Description or notes..."
                                    className="glass-input w-full rounded-lg px-3 py-2 text-sm h-16 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="rounded-lg bg-slate-700/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                                >
                                    Add {newItemType === 'task' ? 'Task' : 'Meeting'}
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    <AnimatePresence>
                        {tasks.map((task) => {
                            const isSelfCreated = task.created_by === user.id
                            return (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`group flex flex-col gap-3 rounded-xl border p-5 transition-all ${task.is_complete
                                            ? 'bg-slate-900/30 border-slate-800 opacity-60'
                                            : 'bg-slate-800/40 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/60'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <button
                                            onClick={() => toggleTask(task.id, task.is_complete)}
                                            className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${task.is_complete
                                                    ? 'border-green-500 bg-green-500 text-white'
                                                    : 'border-slate-500 text-transparent hover:border-indigo-400'
                                                }`}
                                        >
                                            <CheckCircle2 size={14} />
                                        </button>

                                        <div className="flex-1 cursor-pointer" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-lg font-medium ${task.is_complete ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                                        {task.title}
                                                    </span>
                                                    {isSelfCreated && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                            Personal
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {task.type === 'meeting' && <Video size={16} className="text-purple-400" />}
                                                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium border ${getPriorityColor(task.priority)}`}>
                                                        {task.priority.toUpperCase()}
                                                    </span>
                                                    {isSelfCreated && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteTask(task.id, task.created_by)
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    {expandedTask === task.id ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                                </div>
                                            </div>

                                            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                                                {task.due_date && (
                                                    <div className={`flex items-center gap-1 ${new Date(task.due_date) < new Date() && !task.is_complete ? 'text-red-400' : ''}`}>
                                                        <Clock size={12} />
                                                        {new Date(task.due_date).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedTask === task.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden pl-10"
                                            >
                                                {task.description && (
                                                    <p className="mb-4 text-sm text-slate-400">{task.description}</p>
                                                )}

                                                <div className="flex flex-wrap gap-3">
                                                    {task.meeting_link && (
                                                        <a
                                                            href={task.meeting_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-600/30 transition-colors"
                                                        >
                                                            <Video size={14} /> Join Meeting
                                                        </a>
                                                    )}

                                                    {task.due_date && (
                                                        <button
                                                            onClick={() => addToGoogleCalendar(task)}
                                                            className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                                                        >
                                                            <Calendar size={14} /> Add to Google Calendar
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                    {tasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <CheckCircle2 size={48} className="mb-4 opacity-20" />
                            <p>No items yet. Click + to add your first task!</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Chat Area */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-4"
            >
                <div className="glass-card rounded-xl p-1.5 flex gap-1">
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === 'global'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Global Chat
                    </button>
                    <button
                        onClick={() => admin && setActiveTab('dm')}
                        disabled={!admin}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === 'dm'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            } ${!admin ? 'cursor-not-allowed opacity-30' : ''}`}
                    >
                        Admin Support
                    </button>
                </div>

                <div className="flex-1">
                    {activeTab === 'global' ? (
                        <ChatComponent
                            currentUser={user}
                            receiverId={null}
                            title="Global Chat"
                        />
                    ) : (
                        admin && (
                            <ChatComponent
                                currentUser={user}
                                receiverId={admin.id}
                                title={`Chat with Admin`}
                            />
                        )
                    )}
                </div>
            </motion.div>
        </div>
    )
}
