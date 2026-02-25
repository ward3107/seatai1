import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../core/store';
import { User, Trash2, Edit2 } from 'lucide-react';
import clsx from 'clsx';

export default function StudentList() {
  const { students, selectedStudentId, setSelectedStudentId, removeStudent } = useStore();

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">Students</h2>
        <span className="text-sm text-gray-500">{students.length} total</span>
      </div>

      <div className="space-y-2 max-h-60 overflow-auto">
        <AnimatePresence>
          {students.map((student) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                selectedStudentId === student.id
                  ? 'bg-primary-100 border-2 border-primary-300'
                  : 'bg-white hover:bg-gray-100 border-2 border-transparent'
              )}
              onClick={() => setSelectedStudentId(student.id)}
            >
              {/* Avatar */}
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
                  student.gender === 'male'
                    ? 'bg-blue-400'
                    : student.gender === 'female'
                    ? 'bg-pink-400'
                    : 'bg-purple-400'
                )}
              >
                {student.name.charAt(0) || '?'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{student.name || 'Unnamed'}</p>
                <p className="text-xs text-gray-500">
                  Academic: {Math.round(student.academic_score)}% • Behavior: {Math.round(student.behavior_score)}%
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudentId(student.id);
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                >
                  <Edit2 size={14} className="text-gray-500" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStudent(student.id);
                  }}
                  className="p-1.5 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {students.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <User size={32} className="mx-auto mb-2 opacity-50" />
            <p>No students yet</p>
            <p className="text-sm">Add students below</p>
          </div>
        )}
      </div>
    </div>
  );
}
