'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { MonitorX } from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring",   // ✅ valid, TS now knows it's one of allowed types
      stiffness: 120, 
      damping: 20 
    } 
  },
};

export default function NotFound() {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      window.location.href = '/';
    }
  }, [countdown]);

  return (
    <AnimatePresence>
      <div className="bg-gray-950 min-h-screen flex items-center justify-center p-4 text-white font-sans overflow-hidden">
        <motion.div
          className="bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-16 w-full max-w-lg text-center border-4 border-red-500/50"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="flex flex-col items-center justify-center mb-8"
            variants={itemVariants}
          >
            <motion.div
              initial={{ rotate: 0, scale: 0 }}
              animate={{ rotate: 360, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
                repeat: Infinity,
                repeatType: 'reverse',
                duration: 2,
              }}
              className="text-red-500 bg-red-900/30 p-8 rounded-full inline-block shadow-lg mb-4"
            >
              <MonitorX size={80} strokeWidth={1.5} />
            </motion.div>
          </motion.div>
          
          <motion.h1
            className="text-8xl md:text-9xl font-extrabold text-red-500 tracking-tightest leading-none mb-4"
            variants={itemVariants}
          >
            404
          </motion.h1>

          <motion.p
            className="text-2xl md:text-3xl font-light text-gray-300 mb-2"
            variants={itemVariants}
          >
            Connection Terminated
          </motion.p>
          
          <motion.p
            className="text-base md:text-lg text-gray-400 mb-8 max-w-sm mx-auto"
            variants={itemVariants}
          >
            The proctoring channel has been disconnected. The requested page no longer exists.
          </motion.p>
          
          <motion.p
            className="text-lg md:text-xl font-bold text-gray-300 mb-4"
            variants={itemVariants}
          >
            Redirecting to home in
            <motion.span
              key={countdown}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mx-2 text-red-500"
            >
              {countdown}
            </motion.span>
            seconds...
          </motion.p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
