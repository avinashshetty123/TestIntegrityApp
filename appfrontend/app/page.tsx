'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function LandingPage() {
  const router = useRouter();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const opacity1 = useTransform(scrollYProgress, [0, 0.3, 0.6], [0.3, 0.6, 0.3]);
  const opacity2 = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0.3, 0.6, 0.3]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.2, 1]);

  useEffect(() => {
    // Check if user is logged in and redirect to appropriate dashboard
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      const userData = JSON.parse(user);
      if (userData.role === 'tutor') {
        router.push('/tutor/dashboard');
      } else if (userData.role === 'student') {
        router.push('/student/dashboard');
      }
    }
  }, [router]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-gradient-to-b from-white via-orange-200 to-orange-300 text-gray-900 font-['SF Pro Display'] overflow-x-hidden scrollbar-hide">
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-20 -left-20 w-96 h-96 bg-orange-400/10 rounded-full blur-[150px]"
        style={{ y: backgroundY, opacity: opacity1, scale }}
      />
      <motion.div
        className="absolute bottom-10 -right-20 w-80 h-80 bg-orange-300/8 rounded-full blur-[150px]"
        style={{ y: backgroundY, opacity: opacity2, scale }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-orange-200/6 rounded-full blur-[150px]"
        style={{ y: backgroundY, opacity: opacity1 }}
      />

      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-10 items-center justify-center min-h-screen px-10 relative z-10">
        {/* Left: Text */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, type: "spring" }}
        >
          <motion.h1
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="text-5xl md:text-7xl font-semibold bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent"
          >
            TestIntegrity
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 max-w-xl text-xl md:text-2xl text-gray-600 leading-relaxed font-normal"
          >
            Conduct online tests and interviews with{" "}
            <span className="text-orange-600 font-semibold">AI-powered security</span>,{" "}
            <span className="text-orange-500 font-semibold">deepfake detection</span>,{" "}
            <span className="text-orange-700 font-semibold">eye tracking</span>, and{" "}
            <span className="text-orange-600 font-semibold">lockdown browser</span>.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex gap-6"
          >
            <Link href="/signIn">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-gradient-to-b from-orange-500 to-orange-600 text-white rounded-xl font-medium text-lg shadow-[0_4px_20px_rgba(249,115,22,0.25)] hover:shadow-[0_8px_30px_rgba(249,115,22,0.35)] transition-all backdrop-blur-xl"
              >
                Sign In
              </motion.button>
            </Link>
            <Link href="/signIn">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-white/60 backdrop-blur-2xl border border-gray-200/60 text-gray-800 rounded-xl font-medium text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:bg-white/80 transition-all"
              >
                Register
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Right: Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
          whileHover={{ scale: 1.02, rotate: 1 }}
          className="flex justify-center"
        >
          <div className="w-[450px] h-[450px] bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.2)_inset] hover:shadow-[0_30px_80px_rgba(249,115,22,0.3),0_0_0_1px_rgba(255,255,255,0.3)_inset] transition-all">
            <Image src="/dashboard-design.svg" alt="Dashboard" width={400} height={400} className="opacity-90" />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-32 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-6xl font-semibold text-center mb-20 bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent"
        >
          Powerful Features
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {[
            {
              icon: <ShieldCheck className="w-12 h-12 text-orange-600" />,
              title: "AI Proctoring",
              desc: "Real-time monitoring with face recognition, suspicious activity alerts, and fraud prevention.",
              color: "from-orange-500 to-orange-600"
            },
            {
              icon: <Eye className="w-12 h-12 text-orange-600" />,
              title: "Eye Tracking",
              desc: "Monitors student's focus and alerts if attention drifts away from the screen.",
              color: "from-orange-400 to-orange-500"
            },
            {
              icon: <Bot className="w-12 h-12 text-orange-600" />,
              title: "Deepfake Detection",
              desc: "Blocks attempts to cheat using AI-generated video feeds or fake identities.",
              color: "from-orange-600 to-orange-700"
            },
            {
              icon: <Lock className="w-12 h-12 text-orange-600" />,
              title: "Lockdown Browser",
              desc: "Prevents tab switching, copy-paste, or external apps during exams with Electron.",
              color: "from-orange-500 to-orange-600"
            },
            {
              icon: <Video className="w-12 h-12 text-orange-600" />,
              title: "Live Meetings",
              desc: "Securely conduct interviews, viva exams, and collaborative sessions.",
              color: "from-orange-400 to-orange-500"
            },
            {
              icon: <FileCheck className="w-12 h-12 text-orange-600" />,
              title: "Exam Management",
              desc: "Set question papers, auto-distribute to candidates, evaluate, and publish results.",
              color: "from-orange-600 to-orange-700"
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              viewport={{ once: true }}
              className="group p-8 rounded-[2rem] bg-white/50 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.3)_inset] hover:shadow-[0_25px_60px_rgba(249,115,22,0.25),0_0_0_1px_rgba(249,115,22,0.2)_inset] transition-all relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
              <div className="mb-6 transform group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">{feature.title}</h3>
              <p className="text-gray-600 text-base leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-32 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-6xl font-semibold text-center mb-20 bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent"
        >
          How It Works
        </motion.h2>
        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {[
            { icon: <PenTool className="w-12 h-12 text-orange-600" />, step: "Create Test", desc: "Instructors set papers & test rules in minutes.", num: "01" },
            { icon: <Users className="w-12 h-12 text-orange-600" />, step: "Students Join", desc: "Candidates log in securely and start the exam.", num: "02" },
            { icon: <ShieldCheck className="w-12 h-12 text-orange-600" />, step: "AI Proctors", desc: "System monitors video, audio & behavior live.", num: "03" },
            { icon: <FileCheck className="w-12 h-12 text-orange-600" />, step: "Evaluate & Publish", desc: "Auto or manual evaluation with instant result release.", num: "04" },
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              viewport={{ once: true }}
              className="relative p-8 bg-white/50 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.3)_inset] hover:shadow-[0_25px_60px_rgba(249,115,22,0.25),0_0_0_1px_rgba(249,115,22,0.2)_inset] transition-all text-center group"
            >
              <div className="absolute top-4 right-4 text-5xl font-bold text-orange-600/10 group-hover:text-orange-600/20 transition-colors">{step.num}</div>
              <div className="mb-6 flex justify-center transform group-hover:scale-110 transition-transform">{step.icon}</div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">{step.step}</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Us */}
      <section className="px-6 py-32 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-6xl font-semibold text-center mb-20 bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent"
        >
          About Us
        </motion.h2>
        <div className="flex flex-col md:flex-row justify-center gap-8 max-w-5xl mx-auto">
          {[
            { name: "Avinash", role: "Fullstack Developer", desc: "AI systems, backend infrastructure, blockchain security.", gradient: "from-orange-500 to-orange-600" },
            { name: "Vedant", role: "Frontend & UX Engineer", desc: "Interactive UI, seamless experiences, modern design.", gradient: "from-orange-600 to-orange-700" },
          ].map((person, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: i * 0.2, type: "spring", stiffness: 150 }}
              viewport={{ once: true }}
              className="flex-1 flex flex-col items-center p-10 bg-white/50 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.3)_inset] hover:shadow-[0_25px_60px_rgba(249,115,22,0.25),0_0_0_1px_rgba(249,115,22,0.2)_inset] transition-all"
            >
              <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${person.gradient} flex items-center justify-center text-3xl font-semibold text-white shadow-[0_8px_24px_rgba(249,115,22,0.3)]`}>
                {person.name[0]}
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-gray-800">{person.name}</h3>
              <p className="text-base font-medium text-orange-600 mt-2">{person.role}</p>
              <p className="mt-4 text-gray-600 text-sm text-center leading-relaxed">{person.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <footer className="px-6 py-12 text-center border-t border-white/40 bg-white/40 backdrop-blur-2xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-[0_8px_24px_rgba(249,115,22,0.3)]">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <p className="text-gray-700 text-base font-medium">Contact us at</p>
          <a
            href="mailto:avinashshetty@example.com"
            className="text-orange-600 hover:text-orange-700 font-semibold text-lg hover:underline transition-colors"
          >
            avinashshetty@example.com
          </a>
        </motion.div>
      </footer>
    </div>
  );
}