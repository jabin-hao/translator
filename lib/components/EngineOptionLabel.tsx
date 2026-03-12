import React from 'react';

import EngineBrandIcon from './EngineBrandIcon';
import Icon from './Icon';

const builtinEngineValues = new Set(['bing', 'google', 'deepl', 'yandex']);

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
  icon,
}) => {
  return (
    <span style={contentStyle}>
      {builtinEngineValues.has(value) ? (
        <EngineBrandIcon engine={value} size={18} />
      ) : icon ? (
        <Icon name={icon} size={16} />
      ) : null}
      <span style={textGroupStyle}>
        <span>{label}</span>
      </span>
    </span>
  );
};

export default EngineOptionLabel;
