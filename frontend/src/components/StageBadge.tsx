import React from 'react';
import { Sprout, Trees, Flower2, Cherry, Apple } from 'lucide-react';
import { GrowthStage } from '../types';

interface StageBadgeProps {
  stage?: GrowthStage | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StageBadge: React.FC<StageBadgeProps> = ({
  stage = 'Seedling',
  size = 'md',
  showIcon = true,
}) => {
  const getStageConfig = (stageName: string) => {
    switch (stageName) {
      case 'Seedling':
        return {
          icon: Sprout,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'Vegetative':
        return {
          icon: Trees,
          bg: 'bg-green-100 text-green-800 border-green-300',
          dot: 'bg-green-600',
        };
      case 'Flowering':
        return {
          icon: Flower2,
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'Fruit Formation':
      case 'Fruit Development':
        return {
          icon: Cherry,
          bg: 'bg-lime-100 text-lime-800 border-lime-300',
          dot: 'bg-lime-600',
        };
      case 'Maturity':
      case 'Harvest Maturity':
        return {
          icon: Apple,
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-600',
        };
      case 'Pseudostem Emergence':
        return {
          icon: Trees,
          bg: 'bg-teal-100 text-teal-800 border-teal-300',
          dot: 'bg-teal-600',
        };
      case 'Inflorescence':
        return {
          icon: Flower2,
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      default:
        return {
          icon: Sprout,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getStageConfig(stage);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{stage}</span>
    </span>
  );
};
