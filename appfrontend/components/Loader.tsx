"use client";
import { motion } from "framer-motion";

export default function Loader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] z-[9999]">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="mb-8 text-4xl font-bold tracking-wide bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent drop-shadow-lg"
      >
        TestIntegrity
      </motion.div>

      {/* Animated dots */}
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-4 h-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg shadow-orange-200/50"
            animate={{ y: [0, -12, 0] }}
            transition={{
              duration: 0.8,
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
        className="mt-8 text-sm text-gray-600 font-medium"
      >
        Securing your test environment...
      </motion.p>
    </div>
  );
}
