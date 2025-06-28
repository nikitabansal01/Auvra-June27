import React from 'react';

interface MovementCardProps {
  movement: {
    name: string;
    description: string;
    emoji: string;
    gentle: string;
    fun: string;
    strong: string;
  };
}

export function MovementCard({ movement }: MovementCardProps) {
  return (
    <div className="ingredient-card">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xl">{movement.emoji}</span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-2">{movement.name}</h4>
          <p className="text-sm text-gray-600 mb-3">{movement.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="bg-blue-50 p-2 rounded-lg">
              <div className="font-medium text-blue-700 mb-1">🟦 Gentle Way</div>
              <div className="text-blue-600">{movement.gentle}</div>
            </div>
            <div className="bg-orange-50 p-2 rounded-lg">
              <div className="font-medium text-orange-700 mb-1">🟧 Fun Way</div>
              <div className="text-orange-600">{movement.fun}</div>
            </div>
            <div className="bg-green-50 p-2 rounded-lg">
              <div className="font-medium text-green-700 mb-1">🟩 Strong Way</div>
              <div className="text-green-600">{movement.strong}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 