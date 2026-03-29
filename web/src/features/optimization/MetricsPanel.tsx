import { motion } from 'framer-motion';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { BookOpen, Users, Globe, Accessibility, Clock, Zap } from 'lucide-react';

export default function MetricsPanel() {
  const { result } = useStore();
  const { t } = useLanguage();

  if (!result) return null;

  const metrics = [
    {
      label: t('optimization.academic_balance'),
      value: result.objective_scores.academic_balance,
      icon: BookOpen,
      color: 'blue',
    },
    {
      label: t('optimization.behavioral_fit'),
      value: result.objective_scores.behavioral_balance,
      icon: Users,
      color: 'green',
    },
    {
      label: t('optimization.diversity'),
      value: result.objective_scores.diversity,
      icon: Globe,
      color: 'purple',
    },
    {
      label: t('optimization.special_needs'),
      value: result.objective_scores.special_needs,
      icon: Accessibility,
      color: 'orange',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">{t('optimization.results_title')}</h2>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{result.computation_time_ms}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap size={14} />
            <span>{result.generations} {t('optimization.generations')}</span>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="text-center mb-6">
        <div className="text-5xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
          {(result.fitness_score * 100).toFixed(1)}%
        </div>
        <p className="text-sm text-gray-500 mt-1">{t('optimization.overall_fitness_score')}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const percentage = Math.round(metric.value * 100);

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div
                className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                  colorClasses[metric.color as keyof typeof colorClasses]
                }`}
              >
                <Icon size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-800">{percentage}%</div>
              <p className="text-xs text-gray-500">{metric.label}</p>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                  className={`h-full rounded-full ${
                    metric.color === 'blue'
                      ? 'bg-blue-500'
                      : metric.color === 'green'
                      ? 'bg-green-500'
                      : metric.color === 'purple'
                      ? 'bg-purple-500'
                      : 'bg-orange-500'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800">{t('optimization.notes')}:</p>
          <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
            {result.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
