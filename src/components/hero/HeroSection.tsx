'use client';

import { motion } from 'framer-motion';
import ContactInfo from './ContactInfo';
import SkillsShowcase from './SkillsShowcase';

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Personal Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Hi, I&apos;m{' '}
                <span className="text-blue-600 dark:text-blue-400">
                  [Your Name]
                </span>
              </h1>
              <h2 className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 mb-6">
                Full Stack Developer & AI Enthusiast
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-slate-700 dark:text-slate-300 mb-8 leading-relaxed"
            >
              I build intelligent web applications that solve real-world problems. 
              This platform showcases my technical capabilities through an AI-powered 
              job search system that automatically discovers and matches opportunities 
              to my skills and preferences.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-8"
            >
              <ContactInfo />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              <p>
                💡 This entire platform was custom-built to demonstrate my development skills
                while solving my own job search challenges through AI automation.
              </p>
            </motion.div>
          </motion.div>

          {/* Right Column - Skills Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex justify-center lg:justify-end"
          >
            <SkillsShowcase />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;