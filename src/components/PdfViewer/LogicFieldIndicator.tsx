import { cn } from '@/lib/utils';
import type { FieldAction } from '@/types/logicField.types';

interface LogicFieldIndicatorProps {
  action: FieldAction;
  isActive: boolean;
  optionLabel: string;
  optionValue: string;
}

export function LogicFieldIndicator({ 
  action, 
  isActive, 
  optionLabel,
  optionValue 
}: LogicFieldIndicatorProps) {
  return (
    <div 
      className={cn(
        "logic-indicator absolute pointer-events-none z-[1000]",
        isActive && "active"
      )}
      style={{
        left: action.position.x,
        top: action.position.y,
        border: `2px dashed ${isActive ? '#4CAF50' : '#9CA3AF'}`,
        background: isActive ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '12px',
      }}
    >
      <span 
        className={cn(
          "logic-badge inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
          isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
        )}
      >
        {action.type === 'checkmark' && '✓'}
        {action.type === 'fillLabel' && optionLabel}
        {action.type === 'fillCustom' && (action.customText || 'Custom')}
        <span className="text-[10px] opacity-75">
          ({optionValue})
        </span>
      </span>
    </div>
  );
}