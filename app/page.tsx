import Layout from './components/Layout';
import DynamicMapLoader from './components/DynamicMapLoader';


export default function Home() {
  return (
    <Layout>
      <div className="flex flex-grow">
        <div className="flex-grow">
          <DynamicMapLoader />
        </div>
        {/* Collapsible side panel placeholder */}
        <aside className="w-80 bg-gray-900 border-l border-gray-800 p-4 flex flex-col hidden lg:flex">
          <h2 className="text-xl neon-text-green mb-4">City Overview</h2>
          <div className="flex-grow overflow-y-auto">
            {/* Placeholder for Data Feed Status, Alerts, Metrics */}
            <div className="mb-6">
              <h3 className="text-lg electric-blue-text mb-2">Data Feeds</h3>
              <p className="text-gray-400">TRIMARC Live Traffic: <span className="neon-text-green">Online</span></p>
              <p className="text-gray-400">Louisville Cameras: <span className="neon-text-green">Active</span></p>
            </div>
            <div className="mb-6">
              <h3 className="text-lg electric-blue-text mb-2">Alerts & Log</h3>
              <div className="bg-gray-800 p-3 rounded text-sm h-48 overflow-y-auto">
                <p className="text-gray-400 mb-1">[00:05] TRAFFIC: I-64 E, moderate congestion.</p>
                <p className="text-gray-400 mb-1">[00:02] ACCIDENT: I-65 N at Exit 137. Expect delays. <span className="orange-alert">NEW</span></p>
                <p className="text-gray-400 mb-1">[23:58] WEATHER: Heavy rain expected in downtown area.</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg electric-blue-text mb-2">Quick Metrics</h3>
              <p className="text-gray-400">Avg. Speed (City-wide): <span className="yellow-highlight">35 mph</span></p>
              <p className="text-gray-400">Incidents (Last Hour): <span className="bright-red-text">2</span></p>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
