import { Monitor, Tablet, Smartphone } from 'lucide-react';

export default function MobileBlockScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 px-6 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-6">
          <span className="text-white font-bold text-2xl">S</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">SeatAI</h1>
        <p className="text-gray-500 text-sm mb-6">AI-Powered Classroom Seating</p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-amber-900 mb-1">
            Phones aren't supported yet
          </h2>
          <p className="text-sm text-amber-800">
            SeatAI is built for the larger screens teachers use for planning.
            Please open it on a laptop, desktop, or tablet.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 text-gray-600">
          <div className="flex flex-col items-center gap-2">
            <Monitor size={32} className="text-green-600" />
            <span className="text-xs">Desktop</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Tablet size={32} className="text-green-600" />
            <span className="text-xs">Tablet</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-50">
            <Smartphone size={32} className="text-gray-400" />
            <span className="text-xs line-through">Phone</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Tip: rotate a tablet to landscape for the best experience.
        </p>
      </div>
    </div>
  );
}
