'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User as UserIcon } from 'lucide-react'

interface Message {
    id: string
    content: string
    sender_id: string
    receiver_id: string | null
    created_at: string
    profiles?: {
        email: string
    }
}

interface ChatComponentProps {
    currentUser: User
    receiverId: string | null // null for global chat
    title: string
}

export default function ChatComponent({ currentUser, receiverId, title }: ChatComponentProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const supabase = createClient()
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        const fetchMessages = async () => {
            let query = supabase
                .from('messages')
                .select('*, profiles:sender_id(email)')
                .order('created_at', { ascending: true })

            if (receiverId) {
                query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
            } else {
                query = query.is('receiver_id', null)
            }

            const { data } = await query
            if (data) setMessages(data as any)
        }

        fetchMessages()

        // Use unique channel name for each chat context
        const channelName = receiverId
            ? `dm-${[currentUser.id, receiverId].sort().join('-')}`
            : 'global-chat'

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                async (payload) => {
                    const newMessage = payload.new as Message

                    const isGlobal = !receiverId && !newMessage.receiver_id
                    const isDM = receiverId && (
                        (newMessage.sender_id === currentUser.id && newMessage.receiver_id === receiverId) ||
                        (newMessage.sender_id === receiverId && newMessage.receiver_id === currentUser.id)
                    )

                    if (isGlobal || isDM) {
                        const { data: sender } = await supabase
                            .from('profiles')
                            .select('email')
                            .eq('id', newMessage.sender_id)
                            .single()

                        setMessages((prev) => {
                            // Prevent duplicates
                            if (prev.some(m => m.id === newMessage.id)) return prev
                            return [...prev, { ...newMessage, profiles: sender || undefined }]
                        })
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Chat subscription status (${channelName}):`, status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUser.id, receiverId])

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const { error } = await supabase.from('messages').insert({
            content: newMessage,
            sender_id: currentUser.id,
            receiver_id: receiverId,
        })

        if (!error) {
            setNewMessage('')
        }
    }

    return (
        <div className="glass-card flex h-[600px] flex-col rounded-2xl overflow-hidden">
            <div className="border-b border-slate-700/50 bg-slate-900/50 px-6 py-4 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    {title}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/30">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === currentUser.id
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex max-w-[75%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && (
                                        <span className="mb-1 ml-1 text-xs text-slate-400">
                                            {msg.profiles?.email?.split('@')[0]}
                                        </span>
                                    )}
                                    <div
                                        className={`rounded-2xl px-5 py-3 shadow-md ${isMe
                                            ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none'
                                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                                            }`}
                                    >
                                        <p className="text-sm leading-relaxed">{msg.content}</p>
                                    </div>
                                    <span className="mt-1 text-[10px] text-slate-500 opacity-60">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="border-t border-slate-700/50 bg-slate-900/50 p-4 backdrop-blur-xl">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="glass-input flex-1 rounded-xl border-0 px-4 py-3 focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="flex items-center justify-center rounded-xl bg-indigo-600 px-4 text-white transition-all hover:bg-indigo-500 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    )
}
