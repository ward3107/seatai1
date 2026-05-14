/**
 * Optimization Timeline/History Viewer
 *
 * Shows the history of optimization runs and allows
 * stepping through the optimization process.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  History,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import clsx from 'clsx';
import type { OptimizationResult } from '../../types';

interface HistoryEntry {
  generation: number;
  fitness: number;
  timestamp: number;
  result: OptimizationResult;
}

interface OptimizationTimelineProps {
  onClose?: () => void;
}

export default function OptimizationTimeline({ onClose }: OptimizationTimelineProps) {
  const { t } = useLanguage();
  const result = useStore((s) => s.result);

  // Simulate optimization history (in real implementation, this would come from the optimizer)
  const history: HistoryEntry[] = useMemo(() => {
    if (!result) return [];

    const entries: HistoryEntry[] = [];
    const generations = Math.min(result.generations, 20);

    for (let i = 0; i <= generations; i += Math.ceil(generations / 10)) {
      const noise = Math.random() * result.fitness_score * 0.1;
      entries.push({
        generation: i,
        fitness: result.fitness_score * (0.5 + (i / generations) * 0.5) - noise,
        timestamp: Date.now() - (generations - i) * 100,
        result: { ...result, fitness_score: result.fitness_score * (0.5 + (i / generations) * 0.5) },
      });
    }

    return entries.sort((a, b) => a.generation - b.generation);
  }, [result]);

  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const currentEntry = history[currentGeneration];
  const maxGeneration = history.length - 1;

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !history.length) return;
    const interval = setInterval(() => {
      setCurrentGeneration((prev) => {
        const next = prev + 1;
        if (next >= maxGeneration) {
          setIsPlaying(false);
          return maxGeneration;
        }
        return next;
      });
    }, 1000 / playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, history.length, maxGeneration, playbackSpeed]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleSkipForward = () => setCurrentGeneration((prev) => Math.min(prev + 1, maxGeneration));
  const handleSkipBack = () => setCurrentGeneration((prev) => Math.max(prev - 1, 0));
  const handleFastForward = () => setCurrentGeneration(maxGeneration);
  const handleRewind = () => setCurrentGeneration(0);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!history.length) return null;

    const fitnesses = history.map((h) => h.fitness);
    const minFitness = Math.min(...fitnesses);
    const maxFitness = Math.max(...fitnesses);
    const improvement = maxFitness - minFitness;
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

    return {
      minFitness,
      maxFitness,
      improvement,
      avgFitness,
    };
  }, [history]);

  if (!result) {
    return (
      <div className="p-6 text-center text-gray-500">
        <History size={24} className="mx-auto mb-2 opacity-50" />
        <p>{t('classroom.no_history')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-primary-500" />
          <h3 className="font-semibold text-gray-800">{t('classroom.optimization_timeline')}</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-[10px] text-gray-500 uppercase">{t('classroom.min_fitness')}</div>
            <div className="text-sm font-bold text-gray-800">{stats.minFitness.toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-[10px] text-gray-500 uppercase">{t('classroom.max_fitness')}</div>
            <div className="text-sm font-bold text-green-600">{stats.maxFitness.toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-[10px] text-gray-500 uppercase">{t('classroom.improvement')}</div>
            <div className="text-sm font-bold text-primary-600">{stats.improvement.toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-[10px] text-gray-500 uppercase">{t('classroom.avg_fitness')}</div>
            <div className="text-sm font-bold text-gray-800">{stats.avgFitness.toFixed(1)}</div>
          </div>
        </div>
      )}

      {/* Playback Controls */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-500">
            {t('classroom.generation')}: {currentEntry?.generation ?? 0} / {maxGeneration}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaybackSpeed(Math.max(0.25, playbackSpeed / 2))}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                'bg-gray-100 hover:bg-gray-200 text-gray-700',
                playbackSpeed <= 0.25 && 'opacity-50 cursor-not-allowed'
              )}
              disabled={playbackSpeed <= 0.25}
            >
              <FastForward className="w-3 h-3" />
              ×2
            </button>
            <button
              onClick={() => setPlaybackSpeed(Math.min(4, playbackSpeed * 2))}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                'bg-gray-100 hover:bg-gray-200 text-gray-700',
                playbackSpeed >= 4 && 'opacity-50 cursor-not-allowed'
              )}
              disabled={playbackSpeed >= 4}
            >
              <FastForward className="w-3 h-3" />
              ÷2
            </button>
            <span className="text-xs text-gray-500">{playbackSpeed}×</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {/* Rewind */}
          <button onClick={handleRewind} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Go to start">
            <SkipBack size={16} className="text-gray-600" />
          </button>

          {/* Step back */}
          <button onClick={handleSkipBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Step back">
            <Rewind size={16} className="text-gray-600" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className={clsx(
              'p-3 rounded-full transition-colors',
              isPlaying
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            )}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          </button>

          {/* Step forward */}
          <button onClick={handleSkipForward} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Step forward">
            <FastForward size={16} className="text-gray-600" />
          </button>

          {/* Fast forward */}
          <button onClick={handleFastForward} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Go to end">
            <SkipForward size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={maxGeneration}
            value={currentGeneration}
            onChange={(e) => setCurrentGeneration(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      </div>

      {/* Generation Info */}
      {currentEntry && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            {t('classroom.generation')} {currentEntry.generation}
          </h4>
          <div className="text-xs text-gray-600">
            <div className="flex justify-between">
              <span>{t('classroom.fitness_score')}:</span>
              <span className="font-medium text-gray-800">{currentEntry.fitness.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Fitness Chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">
          {t('classroom.fitness_progression')}
        </h4>
        <div className="relative h-32">
          {/* Y-axis */}
          <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-gray-400">
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="absolute left-8 right-0 top-0 bottom-0">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((value) => (
              <div
                key={value}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ bottom: `${value}%` }}
              />
            ))}

            {/* Fitness line */}
            <svg
              className="absolute inset-0 overflow-visible"
              viewBox={`0 0 ${history.length * 20} 100`}
              preserveAspectRatio="none"
            >
              <polyline
                points={history
                  .map((entry, idx) => `${idx * 20},${100 - (entry.fitness / (stats?.maxFitness || 1) * 100)}`)
                  .join(' ')}
                fill="none"
                stroke="rgb(99 102 241)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={currentGeneration * 20}
                cy={100 - (currentEntry?.fitness || 0) / (stats?.maxFitness || 1) * 100}
                r="4"
                fill="rgb(99 102 241)"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
