import React from 'react';

import EngineBrandIcon from './EngineBrandIcon';

const contentStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: '100%',
  gap: 8,
  minHeight: 22,
};

const textGroupStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 8,
  minWidth: 0,
};

interface EngineOptionLabelProps {
  value: string;
  label: string;
  icon?: string;
}

const EngineOptionLabel: React.FC<EngineOptionLabelProps> = ({
  value,
  label,
}) => {
  return (
    <span style={contentStyle}>
      <EngineBrandIcon engine={value} size={18} />
      <span style={textGroupStyle}>
        <span>{label}</span>
      </span>
    </span>
  );
};

export default EngineOptionLabel;
