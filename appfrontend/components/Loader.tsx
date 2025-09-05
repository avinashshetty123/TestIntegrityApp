"use client";
import { motion } from "framer-motion";

export default function Loader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white z-[9999]">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="mb-6 text-3xl font-bold tracking-wide"
      >
        MeetApp
      </motion.div>

      {/* Animated dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 text-sm text-slate-400"
      >
        Securing your test environment...
      </motion.p>
    </div>
  );
}
