import React from 'react';
import { BiLogoBing } from 'react-icons/bi';
import { FaYandex } from 'react-icons/fa6';
import { SiDeepl, SiGoogle } from 'react-icons/si';

type EngineBrand = 'bing' | 'google' | 'deepl' | 'yandex';

interface EngineBrandIconProps {
  engine: string;
  size?: number;
}

const iconMap: Record<
  EngineBrand,
  {
    component: React.ComponentType<{ size?: string | number; color?: string }>;
    color: string;
  }
> = {
  bing: {
    component: BiLogoBing,
    color: '#008373',
  },
  google: {
    component: SiGoogle,
    color: '#4285F4',
  },
  deepl: {
    component: SiDeepl,
    color: '#0F2B46',
  },
  yandex: {
    component: FaYandex,
    color: '#FC3F1D',
  },
};

function isBuiltInEngine(engine: string): engine is EngineBrand {
  return engine === 'bing' || engine === 'google' || engine === 'deepl' || engine === 'yandex';
}

const EngineBrandIcon: React.FC<EngineBrandIconProps> = ({ engine, size = 18 }) => {
  if (!isBuiltInEngine(engine)) {
    return null;
  }

  const { component: BrandIcon, color } = iconMap[engine];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      <BrandIcon size={size} color={color} />
    </span>
  );
};

export default EngineBrandIcon;
