"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in via cookie and redirect
    try {
      const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
      if (!match) return;
      const payload = JSON.parse(atob(match[1].split(".")[1]));
      if (payload.role === "tutor") router.push("/tutor");
      else if (payload.role === "student") router.push("/student");
    } catch {}
  }, [router]);

  return (
    <div className="relative min-h-screen text-gray-800 font-[Inter] overflow-hidden">
      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-10 items-center justify-center min-h-screen px-10 relative z-10">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-extrabold gradient-text drop-shadow-lg"
          >
            TestIntegrity
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 max-w-xl text-lg md:text-xl text-gray-600 leading-relaxed"
          >
            Conduct online tests and interviews with{" "}
            <span className="text-orange-600 font-semibold">
              AI-powered security
            </span>
            ,{" "}
            <span className="text-orange-500 font-semibold">
              deepfake detection
            </span>
            ,{" "}
            <span className="text-orange-700 font-semibold">eye tracking</span>,
            and{" "}
            <span className="text-orange-400 font-semibold">
              lockdown browser
            </span>
            .
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex gap-4"
          >
            <Link href="/signIn">
              <button className="btn-orange">Get Started</button>
            </Link>
            <Link href="/signIn">
              <button className="glass px-7 py-3 rounded-2xl font-semibold text-gray-700 hover:border-orange-300/60 transition-all">
                Sign In
              </button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="flex justify-center"
          style={{ perspective: "1000px" }}
        >
          <div className="glass-card w-[380px] h-[380px] flex items-center justify-center p-8">
            <Image
              src="/dashboard-design.svg"
              alt="Dashboard"
              width={340}
              height={340}
              className="drop-shadow-xl"
            />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 relative z-10">
        <h2 className="text-4xl font-bold text-center mb-4 gradient-text">
          Powerful Features
        </h2>
        <p className="text-center text-gray-500 mb-16">
          Everything you need for secure online examinations
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            {
              icon: <ShieldCheck className="w-8 h-8 text-orange-500" />,
              title: "AI Proctoring",
              desc: "Real-time monitoring with face recognition, suspicious activity alerts, and fraud prevention.",
            },
            {
              icon: <Eye className="w-8 h-8 text-orange-400" />,
              title: "Eye Tracking",
              desc: "Monitors student's focus and alerts if attention drifts away from the screen.",
            },
            {
              icon: <Bot className="w-8 h-8 text-orange-600" />,
              title: "Deepfake Detection",
              desc: "Blocks attempts to cheat using AI-generated video feeds or fake identities.",
            },
            {
              icon: <Lock className="w-8 h-8 text-orange-500" />,
              title: "Lockdown Browser",
              desc: "Prevents tab switching, copy-paste, or external apps during exams with Electron.",
            },
            {
              icon: <Video className="w-8 h-8 text-orange-400" />,
              title: "Live Meetings",
              desc: "Securely conduct interviews, viva exams, and collaborative sessions.",
            },
            {
              icon: <FileCheck className="w-8 h-8 text-orange-600" />,
              title: "Exam Management",
              desc: "Set question papers, auto-distribute to candidates, evaluate, and publish results.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200/50 flex items-center justify-center mb-5 shadow-sm">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-24 relative z-10">
        <h2 className="text-4xl font-bold text-center mb-4 gradient-text">
          How It Works
        </h2>
        <p className="text-center text-gray-500 mb-16">
          Simple, secure, and seamless
        </p>
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: <PenTool className="w-8 h-8 text-orange-500 mx-auto" />,
              step: "01",
              title: "Create Test",
              desc: "Instructors set papers & test rules in minutes.",
            },
            {
              icon: <Users className="w-8 h-8 text-orange-400 mx-auto" />,
              step: "02",
              title: "Students Join",
              desc: "Candidates log in securely and start the exam.",
            },
            {
              icon: <ShieldCheck className="w-8 h-8 text-orange-600 mx-auto" />,
              step: "03",
              title: "AI Proctors",
              desc: "System monitors video, audio & behavior live.",
            },
            {
              icon: <FileCheck className="w-8 h-8 text-orange-500 mx-auto" />,
              step: "04",
              title: "Evaluate",
              desc: "Auto or manual evaluation with instant results.",
            },
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              viewport={{ once: true }}
              className="glass-card p-6 text-center"
            >
              <div className="text-3xl font-black gradient-text mb-4">
                {step.step}
              </div>
              {step.icon}
              <h4 className="mt-4 font-bold text-gray-800">{step.title}</h4>
              <p className="mt-2 text-sm text-gray-500">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="px-6 py-24 relative z-10">
        <h2 className="text-4xl font-bold text-center mb-16 gradient-text">
          About Us
        </h2>
        <div className="flex flex-col md:flex-row justify-center gap-8 max-w-3xl mx-auto">
          {[
            {
              name: "Avinash",
              role: "Fullstack Developer",
              desc: "AI systems, backend infrastructure, blockchain security.",
            },
            {
              name: "Vedant",
              role: "Frontend & UX Engineer",
              desc: "Interactive UI, seamless experiences, modern design.",
            },
          ].map((person, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="glass-card flex flex-col items-center p-8 flex-1"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-orange-200/50">
                {person.name[0]}
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-800">
                {person.name}
              </h3>
              <p className="text-sm text-orange-600 font-medium">
                {person.role}
              </p>
              <p className="mt-2 text-gray-500 text-sm text-center">
                {person.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center glass relative z-10"
        style={{
          borderRadius: 0,
          borderLeft: "none",
          borderRight: "none",
          borderBottom: "none",
        }}
      >
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-gray-500 text-sm flex flex-col items-center gap-2"
        >
          <Mail className="w-5 h-5 text-orange-500" />
          Contact us at{" "}
          <a
            href="mailto:avinashshetty@example.com"
            className="text-orange-600 hover:underline font-medium"
          >
            avinashshetty@example.com
          </a>
          <span className="text-xs text-gray-400 mt-1">
            © 2025 TestIntegrity. Built with ❤️ for secure online education.
          </span>
        </motion.p>
      </footer>
    </div>
  );
}
