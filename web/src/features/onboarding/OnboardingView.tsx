import { motion } from 'framer-motion';
import { Upload, UserPlus, Sparkles, FileText } from 'lucide-react';
import { useStore } from '../../core/store';
import { sampleStudents } from '../../utils/sampleData';

interface Props {
  onOpenSidebar: () => void;
}

const steps = [
  {
    icon: Upload,
    color: 'bg-blue-100 text-blue-600',
    title: 'Import a class roster',
    desc: 'Upload a CSV file with student names and attributes — done in seconds.',
  },
  {
    icon: UserPlus,
    color: 'bg-purple-100 text-purple-600',
    title: 'Add students manually',
    desc: 'Fill in names, scores, relationships, and accessibility needs one by one.',
  },
  {
    icon: Sparkles,
    color: 'bg-amber-100 text-amber-600',
    title: 'Run the optimizer',
    desc: 'The AI engine generates an optimal seating chart in under a second.',
  },
  {
    icon: FileText,
    color: 'bg-green-100 text-green-600',
    title: 'Print or export',
    desc: 'Get a ready-to-hang seating chart as a PDF or PNG.',
  },
];

export default function OnboardingView({ onOpenSidebar }: Props) {
  const { setStudents } = useStore();

  function loadDemo() {
    setStudents(sampleStudents);
    onOpenSidebar();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
          <span className="text-white font-bold text-4xl">S</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome to SeatAI
        </h1>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          Intelligent classroom seating — balancing academic levels, behavior,
          social dynamics, and accessibility requirements automatically.
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-2 gap-4 mb-10 max-w-xl w-full"
      >
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-4 text-left shadow-sm"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${step.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                {step.title}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-3"
      >
        <button
          onClick={onOpenSidebar}
          className="px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <UserPlus size={18} />
          Get started
        </button>
        <button
          onClick={loadDemo}
          className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Sparkles size={18} className="text-amber-500" />
          Load demo class (30 students)
        </button>
      </motion.div>

      <p className="mt-6 text-xs text-gray-400">
        All data stays in your browser — nothing is sent to any server.
      </p>
    </div>
  );
}
