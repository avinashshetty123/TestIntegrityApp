"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck,
  Video,
  Eye,
  Bot,
  Lock,
  Users,
  PenTool,
  FileCheck,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white font-[Inter] overflow-hidden">
      {/* floating background orbs */}
      <motion.div
        className="absolute top-20 -left-20 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 -right-20 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl"
        animate={{ y: [0, -40, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-10 items-center justify-center min-h-screen px-10 relative z-10">
        {/* Left: Text */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 bg-clip-text text-transparent drop-shadow-lg"
          >
            Next-Gen Proctoring


          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 max-w-xl text-lg md:text-xl text-slate-200 leading-relaxed"
          >
            Conduct online tests and interviews with{" "}
            <span className="text-purple-300">AI-powered security</span>,{" "}
            <span className="text-blue-300">deepfake detection</span>,{" "}
            <span className="text-pink-300">eye tracking</span>, and{" "}
            <span className="text-green-300">lockdown browser</span>.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex gap-6"
          >
            <Link href="/signIn">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 rounded-xl px-8"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signIn">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-xl px-8"
              >
                Register
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Right: Placeholder for your SVG */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center"
        >
          <div className="w-[400px] h-[400px] bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
            
            <span className="text-slate-400"><Image src="/dashboard-design.svg" alt="Dashboard" width={400} height={400} /></span>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 relative z-10 bg-gradient-to-b from-slate-950 to-slate-900">
        <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
        <div className="grid md:grid-cols-3 gap-10 max-w-7xl mx-auto">
          {[
            {
              icon: <ShieldCheck className="w-10 h-10 text-blue-400" />,
              title: "AI Proctoring",
              desc: "Real-time monitoring with face recognition, suspicious activity alerts, and fraud prevention.",
            },
            {
              icon: <Eye className="w-10 h-10 text-purple-400" />,
              title: "Eye Tracking",
              desc: "Monitors student’s focus and alerts if attention drifts away from the screen.",
            },
            {
              icon: <Bot className="w-10 h-10 text-green-400" />,
              title: "Deepfake Detection",
              desc: "Blocks attempts to cheat using AI-generated video feeds or fake identities.",
            },
            {
              icon: <Lock className="w-10 h-10 text-red-400" />,
              title: "Lockdown Browser",
              desc: "Prevents tab switching, copy-paste, or external apps during exams with Electron.",
            },
            {
              icon: <Video className="w-10 h-10 text-yellow-400" />,
              title: "Live Meetings",
              desc: "Securely conduct interviews, viva exams, and collaborative sessions.",
            },
            {
              icon: <FileCheck className="w-10 h-10 text-pink-400" />,
              title: "Exam Management",
              desc: "Set question papers, auto-distribute to candidates, evaluate, and publish results.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10 shadow-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition relative"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-300 text-sm">{feature.desc}</p>
         
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-24 relative z-10 bg-gradient-to-r from-indigo-950/70 to-slate-950">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto text-center">
          {[
            { icon: <PenTool className="w-10 h-10 text-blue-400 mx-auto" />, step: "Create Test", desc: "Instructors set papers & test rules in minutes." },
            { icon: <Users className="w-10 h-10 text-purple-400 mx-auto" />, step: "Students Join", desc: "Candidates log in securely and start the exam." },
            { icon: <ShieldCheck className="w-10 h-10 text-green-400 mx-auto" />, step: "AI Proctors", desc: "System monitors video, audio & behavior live." },
            { icon: <FileCheck className="w-10 h-10 text-pink-400 mx-auto" />, step: "Evaluate & Publish", desc: "Auto or manual evaluation with instant result release." },
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="p-6 bg-white/5 border border-white/10 rounded-xl shadow-md hover:scale-105 transition"
            >
              {step.icon}
              <h4 className="mt-4 font-semibold">{step.step}</h4>
              <p className="mt-2 text-sm text-slate-300">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Us */}
      <section className="px-6 py-24 bg-gradient-to-t from-black/70 to-slate-950 relative z-10">
        <h2 className="text-4xl font-bold text-center mb-16">About Us</h2>
        <div className="flex flex-col md:flex-row justify-center gap-10 max-w-4xl mx-auto">
          {[
            { name: "Avinash", role: "Fullstack Developer", desc: "AI systems, backend infrastructure, blockchain security." },
            { name: "Vedant", role: "Frontend & UX Engineer", desc: "Interactive UI, seamless experiences, modern design." },
          ].map((person, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="flex flex-col items-center p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold">
                {person.name[0]}
              </div>
              <h3 className="mt-4 text-xl font-semibold">{person.name}</h3>
              <p className="text-sm text-blue-300">{person.role}</p>
              <p className="mt-2 text-slate-300 text-sm text-center">{person.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <footer className="px-6 py-10 text-center border-t border-white/10 bg-black/70 backdrop-blur-xl relative z-10">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-slate-300 text-sm flex flex-col items-center gap-2"
        >
          <Mail className="w-6 h-6 text-blue-400" />
          Contact us at{" "}
          <a
            href="mailto:avinashshetty@example.com"
            className="text-blue-400 hover:underline"
          >
            avinashshetty@example.com
          </a>
        </motion.p>
      </footer>
    </div>
  );
}
