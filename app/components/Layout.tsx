import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col">
      <header className="w-full p-4 border-b border-gray-800 flex items-center justify-between">
        <h1 className="text-2xl neon-text-green">WATCH CITIES</h1>
        <div className="flex items-center space-x-4">
          {/* Placeholder for City Selector */}
          <select className="bg-gray-900 text-white border border-gray-700 rounded p-2 text-sm">
            <option>Louisville</option>
            <option>Bowling Green</option>
            <option>Nashville</option>
          </select>
          {/* Placeholder for Settings/Alerts/Profile Icons */}
          <div className="text-gray-400 text-lg">
            <span className="mx-2">⚙️</span>
            <span className="mx-2">🔔</span>
            <span className="mx-2">👤</span>
          </div>
        </div>
      </header>
      <main className="flex-grow flex">
        {/* Main content area for the map */}
        {children}
      </main>
      {/* Optionally, a footer could go here */}
    </div>
  );
};

export default Layout;
