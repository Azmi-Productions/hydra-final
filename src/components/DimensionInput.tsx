import React from 'react';

// Common interface for dimensions
export interface Dimensions {
  length: string;
  width: string;
  depth: string;
}

interface DimensionInputProps {
  label: string;
  value: Dimensions | null;
  onChange: (val: Dimensions) => void;
  readOnly?: boolean;
  showDepth?: boolean;
}

const DimensionInput: React.FC<DimensionInputProps> = ({ 
  label, 
  value, 
  onChange, 
  readOnly = false,
  showDepth = true
}) => {
  // Default to empty strings if value is null
  const { length = "", width = "", depth = "" } = value || {};

  const update = (field: keyof Dimensions, newValue: string) => {
    if (readOnly) return;
    onChange({
      length: field === 'length' ? newValue : length,
      width: field === 'width' ? newValue : width,
      depth: field === 'depth' ? newValue : depth,
    });
  };

  const inputClass = `w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-800 transition duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${readOnly ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`;

  return (
    <div className="relative">
      <label className="text-sm font-medium text-gray-600 mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
            <input
            type="number"
            className={inputClass}
            placeholder="L"
            value={length}
            onChange={(e) => update('length', e.target.value)}
            readOnly={readOnly}
            />
             <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">m</span>
        </div>
        <span className="text-gray-400 font-bold text-xs">X</span>
        <div className="flex-1 relative">
            <input
            type="number"
            className={inputClass}
            placeholder="W"
            value={width}
            onChange={(e) => update('width', e.target.value)}
            readOnly={readOnly}
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">m</span>
        </div>
        {showDepth && (
          <>
            <span className="text-gray-400 font-bold text-xs">X</span>
            <div className="flex-1 relative">
                <input
                type="number"
                className={inputClass}
                placeholder="D"
                value={depth}
                onChange={(e) => update('depth', e.target.value)}
                readOnly={readOnly}
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">m</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DimensionInput;
