// birddog-app/app/components/GameOverlay.tsx
'use client';

import React, { useState } from 'react';
import { OverlayLayer } from './Map'; // Import OverlayLayer from Map component

type MapInteraction = { type: string; details: any; timestamp: number };

interface GameOverlayProps {
  lastInteraction: MapInteraction | null;
  onActivateControl: () => void; // Prop for the control button callback
  onToggleLayer: (layerType: OverlayLayer) => void; // New prop for layer toggling
  eventLogs: string[]; // New prop to receive event logs
  miniGamePrompt: string | null; // New prop for mini-game prompt
  setMiniGamePrompt: React.Dispatch<React.SetStateAction<string | null>>; // Setter for mini-game prompt
}

const GameOverlay: React.FC<GameOverlayProps> = ({ lastInteraction, onActivateControl, onToggleLayer, eventLogs, miniGamePrompt, setMiniGamePrompt }) => {

  const handleControlClick = () => {
    console.log('World control button clicked!');
    onActivateControl(); // Call the passed-in callback
  };

  const handleToggleLayerClick = () => {
    console.log('Toggle layer button clicked!');
    onToggleLayer('heatmap'); // Example: toggle a 'heatmap' layer
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 p-4">
      {/* Placeholder for game-like UI elements and watchdog indicators */}
      <div className="bg-gray-800 bg-opacity-70 text-white p-2 rounded-lg text-sm pointer-events-auto">
        <p>Watchdog Status: Operational</p>
        <p>Monitoring...</p>
        {lastInteraction && (
          <p>
            Last Interaction: {lastInteraction.type} at {new Date(lastInteraction.timestamp).toLocaleTimeString()}
          </p>
        )}
        <button
          onClick={handleControlClick}
          className="mt-2 mr-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-800 text-white font-bold py-1 px-2 rounded text-xs pointer-events-auto transition-all duration-150 ease-in-out"
        >
          Activate Control
        </button>
        <button
          onClick={handleToggleLayerClick}
          className="mt-2 bg-green-600 hover:bg-green-500 active:bg-green-800 text-white font-bold py-1 px-2 rounded text-xs pointer-events-auto transition-all duration-150 ease-in-out"
        >
          Toggle Heatmap
        </button>

        {miniGamePrompt && (
          <div className="mt-4 p-2 bg-yellow-700 bg-opacity-90 rounded-lg text-black font-bold text-center">
            <p className="text-lg animate-pulse">{miniGamePrompt}</p>
            <button
              onClick={() => setMiniGamePrompt(null)} // Allow user to dismiss prompt
              className="mt-2 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-bold py-1 px-2 rounded text-xs pointer-events-auto transition-all duration-150 ease-in-out"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-4 p-2 bg-gray-900 bg-opacity-80 rounded-lg max-h-40 overflow-y-auto">
          <p className="font-bold text-yellow-400">Event Log:</p>
          {eventLogs.map((log, index) => (
            <p key={index} className="text-xs text-gray-300">{log}</p>
          ))}
          {eventLogs.length === 0 && <p className="text-xs text-gray-400">No events yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default GameOverlay;