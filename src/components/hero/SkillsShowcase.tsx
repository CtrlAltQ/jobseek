'use client';

import { motion } from 'framer-motion';

const SkillsShowcase = () => {
  const skillCategories = [
    {
      title: 'Frontend',
      skills: [
        { name: 'React', icon: '⚛️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
        { name: 'Next.js', icon: '▲', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
        { name: 'TypeScript', icon: 'TS', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
        { name: 'Tailwind', icon: '🎨', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' }
      ]
    },
    {
      title: 'Backend',
      skills: [
        { name: 'Node.js', icon: '🟢', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
        { name: 'Python', icon: '🐍', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
        { name: 'MongoDB', icon: '🍃', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
        { name: 'APIs', icon: '🔗', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' }
      ]
    },
    {
      title: 'AI & Tools',
      skills: [
        { name: 'OpenAI', icon: '🤖', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
        { name: 'Web Scraping', icon: '🕷️', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
        { name: 'Automation', icon: '⚡', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
        { name: 'Git', icon: '📝', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' }
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const categoryVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const skillVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-md w-full"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Tech Stack
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Technologies I use to build amazing things
        </p>
      </motion.div>

      <div className="space-y-6">
        {skillCategories.map((category) => (
          <motion.div
            key={category.title}
            variants={categoryVariants}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              {category.title}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {category.skills.map((skill) => (
                <motion.div
                  key={skill.name}
                  variants={skillVariants}
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                  className={`${skill.color} rounded-lg p-3 text-center cursor-default transition-all duration-200 hover:shadow-md`}
                  tabIndex={-1}
                >
                  <div className="text-lg mb-1">{skill.icon}</div>
                  <div className="text-sm font-medium">{skill.name}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Platform Highlight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
      >
        <div className="text-center">
          <div className="text-2xl mb-2">🚀</div>
          <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            AI Job Finder
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This platform demonstrates my full-stack development skills through 
            an AI-powered job search automation system.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SkillsShowcase;