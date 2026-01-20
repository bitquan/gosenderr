'use client';

type PackageEquipment = 'dolly' | 'blankets' | 'straps' | 'liftgate' | 'tools' | 'cooler' | 'insulated_bag';

interface EquipmentBadgesProps {
  equipment: PackageEquipment[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

const EQUIPMENT_CONFIG: Record<PackageEquipment, { icon: string; label: string; color: string }> = {
  dolly: {
    icon: '🛒',
    label: 'Dolly',
    color: 'bg-blue-100 text-blue-800',
  },
  blankets: {
    icon: '🧺',
    label: 'Blankets',
    color: 'bg-green-100 text-green-800',
  },
  straps: {
    icon: '🪢',
    label: 'Straps',
    color: 'bg-purple-100 text-purple-800',
  },
  liftgate: {
    icon: '🚚',
    label: 'Liftgate',
    color: 'bg-orange-100 text-orange-800',
  },
  tools: {
    icon: '🔧',
    label: 'Tools',
    color: 'bg-red-100 text-red-800',
  },
  cooler: {
    icon: '❄️',
    label: 'Cooler',
    color: 'bg-cyan-100 text-cyan-800',
  },
  insulated_bag: {
    icon: '🧊',
    label: 'Insulated Bag',
    color: 'bg-teal-100 text-teal-800',
  },
};

const SIZE_CLASSES = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'text-sm',
    gap: 'gap-1',
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'text-base',
    gap: 'gap-1.5',
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'text-lg',
    gap: 'gap-2',
  },
};

export function EquipmentBadges({ 
  equipment, 
  size = 'md',
  showLabels = true 
}: EquipmentBadgesProps) {
  if (!equipment || equipment.length === 0) {
    return null;
  }

  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div className={`flex flex-wrap ${sizeClasses.gap}`}>
      {equipment.map((item) => {
        const config = EQUIPMENT_CONFIG[item];
        if (!config) return null;

        return (
          <div
            key={item}
            className={`inline-flex items-center ${sizeClasses.gap} ${sizeClasses.container} rounded-full font-medium ${config.color} transition-transform hover:scale-105`}
            title={config.label}
          >
            <span className={sizeClasses.icon}>{config.icon}</span>
            {showLabels && <span>{config.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

// Compact version for tight spaces
export function EquipmentIcons({ equipment }: { equipment: PackageEquipment[] }) {
  if (!equipment || equipment.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1">
      {equipment.map((item) => {
        const config = EQUIPMENT_CONFIG[item];
        if (!config) return null;

        return (
          <span
            key={item}
            className="text-lg"
            title={config.label}
            role="img"
            aria-label={config.label}
          >
            {config.icon}
          </span>
        );
      })}
    </div>
  );
}

// Equipment selector component for forms
interface EquipmentSelectorProps {
  selected: PackageEquipment[];
  onChange: (equipment: PackageEquipment[]) => void;
  disabled?: boolean;
}

export function EquipmentSelector({ selected, onChange, disabled }: EquipmentSelectorProps) {
  const toggleEquipment = (item: PackageEquipment) => {
    if (selected.includes(item)) {
      onChange(selected.filter((e) => e !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {(Object.keys(EQUIPMENT_CONFIG) as PackageEquipment[]).map((item) => {
        const config = EQUIPMENT_CONFIG[item];
        const isSelected = selected.includes(item);

        return (
          <button
            key={item}
            type="button"
            onClick={() => toggleEquipment(item)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition-all ${
              isSelected
                ? 'border-blue-600 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="text-3xl mb-2">{config.icon}</div>
            <div className="text-sm font-medium text-gray-900">{config.label}</div>
          </button>
        );
      })}
    </div>
  );
}
