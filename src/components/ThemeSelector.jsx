import React from 'react';
import { THEMES } from '../utils/gameData';
import { Palette } from 'lucide-react';
import { playHoverSound } from '../utils/audio';

export default function ThemeSelector({ activeTheme, onSelectTheme }) {
  return (
    <div className="glass-panel p-5 rounded-2xl flex-col gap-4">
      <div className="panel-header border-b pb-2 flex-row items-center gap-2">
        <Palette className="icon-sub" />
        <h2>Select Theme</h2>
      </div>

      <div className="theme-grid gap-3">
        {Object.values(THEMES).map((theme) => {
          const isActive = theme.id === activeTheme.id;
          return (
            <button
              key={theme.id}
              onClick={() => {
                playHoverSound();
                onSelectTheme(theme);
              }}
              className={`theme-card flex-col gap-2 ${isActive ? 'active' : ''}`}
            >
              <span className="theme-card-name">
                {theme.name}
              </span>
              
              {/* Color dots preview */}
              <div className="flex-row gap-2 mt-1">
                <span 
                  className="color-dot border" 
                  style={{ background: theme.canvasBg }} 
                  title="Canvas Background"
                />
                <span 
                  className="color-dot border" 
                  style={{ background: theme.snakeHead }} 
                  title="Snake Head"
                />
                <span 
                  className="color-dot border" 
                  style={{ background: theme.food }} 
                  title="Food"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
