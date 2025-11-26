'use client'

import { login } from './actions'
import { motion } from 'framer-motion'
import { Lock, Mail, ArrowRight } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/background.png"
                    alt="Background"
                    fill
                    className="object-cover opacity-40"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="glass-card relative z-10 w-full max-w-md overflow-hidden rounded-2xl p-8 sm:p-10"
            >
                <div className="mb-8 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/20"
                    >
                        <Lock size={32} />
                    </motion.div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Sign in to access your organization portal
                    </p>
                </div>

                <form className="space-y-6">
                    <div className="space-y-4">
                        <div className="group relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Mail className="h-5 w-5 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
                            </div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="glass-input block w-full rounded-lg border py-3 pl-10 pr-3 focus:outline-none focus:ring-2"
                                placeholder="Email address"
                            />
                        </div>
                        <div className="group relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Lock className="h-5 w-5 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="glass-input block w-full rounded-lg border py-3 pl-10 pr-3 focus:outline-none focus:ring-2"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <button
                        formAction={login}
                        className="glass-button group flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold"
                    >
                        Sign in
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
