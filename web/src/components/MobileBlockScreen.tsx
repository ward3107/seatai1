import { RotateCcw } from 'lucide-react';

export default function MobileBlockScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 px-6 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-6">
          <span className="text-white font-bold text-2xl">S</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">SeatAI</h1>
        <p className="text-gray-500 text-sm mb-6">AI-Powered Classroom Seating</p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <RotateCcw size={28} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-900 text-left">
            Your screen is too narrow in portrait. Rotate to landscape, or open
            on a tablet, laptop, or desktop for the full experience.
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Once rotated, this screen disappears automatically.
        </p>
      </div>
    </div>
  );
}
