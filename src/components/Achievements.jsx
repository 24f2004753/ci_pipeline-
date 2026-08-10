import React from 'react';
import * as Icons from 'lucide-react';
import { ACHIEVEMENTS } from '../utils/gameData';

export default function Achievements({ unlockedIds = [] }) {
  return (
    <div className="glass-panel p-5 rounded-2xl flex-col gap-4">
      <div className="panel-header border-b pb-2 flex-row items-center gap-2">
        <Icons.Trophy className="icon-sub" />
        <h2>Achievements</h2>
        <span className="badge badge-mono ml-auto">
          {unlockedIds.length} / {ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="achievement-list flex-col gap-3 custom-scrollbar">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          const IconComponent = Icons[achievement.icon] || Icons.Award;

          return (
            <div
              key={achievement.id}
              className={`achievement-card flex-row items-center gap-3 border ${
                isUnlocked ? 'unlocked' : 'locked'
              }`}
            >
              <div className="achievement-icon-container">
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-col text-left">
                <span className="achievement-title">
                  {achievement.title}
                </span>
                <span className="achievement-desc">
                  {achievement.description}
                </span>
              </div>
              {isUnlocked && (
                <div className="achievement-check ml-auto">
                  <Icons.CheckCircle2 className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
