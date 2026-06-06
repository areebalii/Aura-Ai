import React from 'react';
import { motion } from 'framer-motion';

export default function AuraLoader() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-screen w-screen bg-[#131314] overflow-hidden"
    >
      {/* 1. Visual Engine */}
      <motion.div variants={itemVariants} className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full animate-pulse" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="w-32 h-32 border-t-2 border-l-2 border-blue-500/30 rounded-full flex items-center justify-center"
        >
          <div className="w-24 h-24 border-b-2 border-r-2 border-purple-500/30 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center">
              <span className="text-white font-black text-2xl tracking-tighter">AI</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* 2. Brand Identity */}
      <motion.div variants={itemVariants} className="text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-purple-200 tracking-[0.2em]">
          AURA AI
        </h1>
      </motion.div>

      {/* 3. Advanced Status Track */}
      <motion.div variants={itemVariants} className="mt-8 w-48 h-1.5 bg-[#1e1f20] rounded-full overflow-hidden relative">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
          initial={{ width: "0%" }}
          animate={{ width: "100%", x: [-100, 100] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.p
        variants={itemVariants}
        className="mt-4 text-[#6b7280] font-mono text-[10px] uppercase tracking-[0.3em]"
      >
        Neural Link Active
      </motion.p>
    </motion.div>
  );
}