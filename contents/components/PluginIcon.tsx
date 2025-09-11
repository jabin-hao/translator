import React from 'react';
import { IconLanguage } from '@tabler/icons-react';

interface PluginIconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

const PluginIcon: React.FC<PluginIconProps> = ({ className, style, size = 24 }) => (
  <IconLanguage 
    size={size}
    className={className}
    style={{ color: '#2386e1', ...style }}
  />
);

export default PluginIcon; 