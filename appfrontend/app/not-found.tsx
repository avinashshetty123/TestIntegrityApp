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
      <div className="bg-gradient-to-br from-orange-50 via-orange-100 to-white min-h-screen flex items-center justify-center p-4 font-['Inter'] overflow-hidden">
        <motion.div
          className="bg-white/60 backdrop-blur-3xl rounded-3xl shadow-2xl shadow-orange-200/50 p-8 md:p-16 w-full max-w-lg text-center border border-orange-200/50"
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
              className="text-white bg-gradient-to-r from-orange-500 to-orange-600 p-8 rounded-full inline-block shadow-xl shadow-orange-200/50 mb-4"
            >
              <MonitorX size={80} strokeWidth={1.5} />
            </motion.div>
          </motion.div>
          
          <motion.h1
            className="text-8xl md:text-9xl font-extrabold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent tracking-tightest leading-none mb-4 drop-shadow-lg"
            variants={itemVariants}
          >
            404
          </motion.h1>

          <motion.p
            className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2"
            variants={itemVariants}
          >
            Connection Terminated
          </motion.p>
          
          <motion.p
            className="text-base md:text-lg text-gray-600 mb-8 max-w-sm mx-auto font-medium"
            variants={itemVariants}
          >
            The proctoring channel has been disconnected. The requested page no longer exists.
          </motion.p>
          
          <motion.p
            className="text-lg md:text-xl font-bold text-gray-700 mb-4"
            variants={itemVariants}
          >
            Redirecting to home in
            <motion.span
              key={countdown}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mx-2 text-orange-600 font-extrabold"
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
