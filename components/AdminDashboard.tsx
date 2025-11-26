'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import ChatComponent from './ChatComponent'
import { Plus, User as UserIcon, CheckCircle2, Circle, LayoutDashboard, Search, Calendar, Video, Trash2, Clock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AdminDashboardProps {
    user: User
}

interface Profile {
    id: string
    email: string
    role: string
}

interface Task {
    id: string
    title: string
    description?: string
    is_complete: boolean
    assignee_id: string
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    type: 'task' | 'meeting'
    meeting_link?: string
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
    const [staff, setStaff] = useState<Profile[]>([])
    const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [activeTab, setActiveTab] = useState<'global' | 'dm'>('global')
    const [isCreatingUser, setIsCreatingUser] = useState(false)

    // New Item Form State
    const [newItemType, setNewItemType] = useState<'task' | 'meeting'>('task')
    const [newItemTitle, setNewItemTitle] = useState('')
    const [newItemDesc, setNewItemDesc] = useState('')
    const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high'>('medium')
    const [newItemDate, setNewItemDate] = useState('')
    const [newItemLink, setNewItemLink] = useState('')

    // User Creation State
    const [newStaffEmail, setNewStaffEmail] = useState('')
    const [newStaffPassword, setNewStaffPassword] = useState('')
    const [createError, setCreateError] = useState('')
    const [createSuccess, setCreateSuccess] = useState('')

    const supabase = createClient()

    useEffect(() => {
        fetchStaff()
    }, [])

    useEffect(() => {
        if (selectedStaff) {
            fetchTasks(selectedStaff.id)
            setActiveTab('dm')

            const channel = supabase
                .channel(`tasks-${selectedStaff.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tasks',
                        filter: `assignee_id=eq.${selectedStaff.id}`,
                    },
                    () => {
                        fetchTasks(selectedStaff.id)
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [selectedStaff])

    const fetchStaff = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'staff')
        if (data) setStaff(data)
    }

    const fetchTasks = async (staffId: string) => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('assignee_id', staffId)
            .order('created_at', { ascending: false })
        if (data) setTasks(data)
    }

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateError('')
        setCreateSuccess('')

        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newStaffEmail, password: newStaffPassword }),
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            setCreateSuccess('Staff created successfully')
            setNewStaffEmail('')
            setNewStaffPassword('')
            setIsCreatingUser(false)
            fetchStaff()
        } catch (err: any) {
            setCreateError(err.message)
        }
    }

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedStaff || !newItemTitle.trim()) return

        const { error } = await supabase.from('tasks').insert({
            title: newItemTitle,
            description: newItemDesc,
            priority: newItemPriority,
            due_date: newItemDate ? new Date(newItemDate).toISOString() : null,
            type: newItemType,
            meeting_link: newItemLink,
            assignee_id: selectedStaff.id,
            created_by: user.id,
        })

        if (!error) {
            setNewItemTitle('')
            setNewItemDesc('')
            setNewItemDate('')
            setNewItemLink('')
            fetchTasks(selectedStaff.id)
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        await supabase.from('tasks').delete().eq('id', taskId)
        if (selectedStaff) fetchTasks(selectedStaff.id)
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 h-[calc(100vh-8rem)]">
            {/* Sidebar */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-3 flex flex-col gap-4 glass-card rounded-2xl p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserIcon className="text-indigo-400" /> Staff
                    </h2>
                    <button
                        onClick={() => setIsCreatingUser(!isCreatingUser)}
                        className="rounded-full bg-indigo-600/20 p-2 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <AnimatePresence>
                    {isCreatingUser && (
                        <motion.form
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleCreateStaff}
                            className="space-y-3 overflow-hidden rounded-xl bg-slate-800/50 p-4 border border-slate-700"
                        >
                            <input
                                type="email"
                                placeholder="Email"
                                value={newStaffEmail}
                                onChange={(e) => setNewStaffEmail(e.target.value)}
                                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={newStaffPassword}
                                onChange={(e) => setNewStaffPassword(e.target.value)}
                                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                                required
                            />
                            <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500">
                                Create Account
                            </button>
                            {createError && <p className="text-xs text-red-400">{createError}</p>}
                            {createSuccess && <p className="text-xs text-green-400">{createSuccess}</p>}
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {staff.map((s) => (
                        <motion.button
                            key={s.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedStaff(s)}
                            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${selectedStaff?.id === s.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-800/30 text-slate-300 hover:bg-slate-800/50'
                                }`}
                        >
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedStaff?.id === s.id ? 'bg-white/20' : 'bg-slate-700'
                                }`}>
                                <UserIcon size={18} />
                            </div>
                            <span className="truncate text-sm font-medium">{s.email}</span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-6 flex flex-col gap-6"
            >
                <div className="flex-1 glass-card rounded-2xl p-8 overflow-hidden flex flex-col">
                    {selectedStaff ? (
                        <>
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <LayoutDashboard className="text-indigo-400" />
                                    Workspace
                                    <span className="text-sm font-normal text-slate-400 ml-2">for {selectedStaff.email}</span>
                                </h2>
                            </div>

                            {/* Add Item Form */}
                            <form onSubmit={handleAddItem} className="mb-8 space-y-4 rounded-xl bg-slate-800/30 p-4 border border-slate-700/50">
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
                                        className="glass-input w-full rounded-lg px-3 py-2"
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
                                        className="glass-input w-full rounded-lg px-3 py-2 text-sm h-20 resize-none"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                                    >
                                        Add {newItemType === 'task' ? 'Task' : 'Meeting'}
                                    </button>
                                </div>
                            </form>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                <AnimatePresence>
                                    {tasks.map((task) => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className={`group relative flex flex-col gap-2 rounded-xl border p-4 transition-all ${task.is_complete
                                                    ? 'bg-slate-900/30 border-slate-800 opacity-60'
                                                    : 'bg-slate-800/40 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/60'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`mt-1 ${task.type === 'meeting' ? 'text-purple-400' : 'text-indigo-400'}`}>
                                                        {task.type === 'meeting' ? <Video size={18} /> : <Circle size={18} />}
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-medium ${task.is_complete ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                                            {task.title}
                                                        </h3>
                                                        {task.description && (
                                                            <p className="text-sm text-slate-400 line-clamp-1">{task.description}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium border ${getPriorityColor(task.priority)}`}>
                                                        {task.priority.toUpperCase()}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 pl-8 text-xs text-slate-500">
                                                {task.due_date && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {new Date(task.due_date).toLocaleString()}
                                                    </div>
                                                )}
                                                {task.meeting_link && (
                                                    <a
                                                        href={task.meeting_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-indigo-400 hover:underline"
                                                    >
                                                        <Video size={12} /> Join Meeting
                                                    </a>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {tasks.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                        <CheckCircle2 size={48} className="mb-4 opacity-20" />
                                        <p>No items assigned yet.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-slate-400">
                            <Search size={64} className="mb-6 opacity-20" />
                            <p className="text-xl font-medium">Select a staff member</p>
                            <p className="text-sm opacity-60">Manage tasks and view details</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Chat Sidebar */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-3 flex flex-col gap-4"
            >
                <div className="glass-card rounded-xl p-1.5 flex gap-1">
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === 'global'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Global
                    </button>
                    <button
                        onClick={() => selectedStaff && setActiveTab('dm')}
                        disabled={!selectedStaff}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === 'dm'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            } ${!selectedStaff ? 'cursor-not-allowed opacity-30' : ''}`}
                    >
                        Direct
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
                        selectedStaff && (
                            <ChatComponent
                                currentUser={user}
                                receiverId={selectedStaff.id}
                                title={`Chat with ${selectedStaff.email.split('@')[0]}`}
                            />
                        )
                    )}
                </div>
            </motion.div>
        </div>
    )
}
