import React from 'react';

interface SelectOptionLabelProps {
  label: string;
}

const SelectOptionLabel: React.FC<SelectOptionLabelProps> = ({ label }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        width: '100%',
        gap: 8,
        minHeight: 22,
      }}
    >
      <span>{label}</span>
    </span>
  );
};

export default SelectOptionLabel;
