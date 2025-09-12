import React from 'react';
import {
  IconBrandGoogle,
  IconBrandEdge,
  IconBrandYandex,
  IconBrandGithub,
  IconLanguage,
  IconSettings,
  IconBrightnessAuto,
  IconSun,
  IconMoon,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDownload,
  IconUpload,
  IconFileExport,
  IconFileImport,
  IconVolume,
  IconVolume2,
  IconVolumeOff,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconCopy,
  IconCheck,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconHome,
  IconBook,
  IconHelp,
  IconInfoCircle,
  IconAlertTriangle,
  IconAlertCircle,
  IconCircleCheck,
  IconHeart,
  IconDatabase,
  IconKeyboard,
  IconWorld,
  IconCursorText,
  IconTool,
  IconStar,
  IconStarFilled,
  IconLoader,
  IconArrowsLeftRight,
} from '@tabler/icons-react';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Tabler图标映射
const iconMap: { [key: string]: React.ComponentType<any> } = {
  // 品牌图标
  'brand-google': IconBrandGoogle,
  'brand-edge': IconBrandEdge,
  'brand-yandex': IconBrandYandex,
  'brand-github': IconBrandGithub,
  'language': IconLanguage,
  
  // 功能图标
  'translate': IconLanguage,
  'settings': IconSettings,
  'brightness-auto': IconBrightnessAuto,
  'sun': IconSun,
  'moon': IconMoon,
  'reload': IconRefresh,
  'plus': IconPlus,
  'edit': IconEdit,
  'delete': IconTrash,
  'download': IconDownload,
  'upload': IconUpload,
  'export': IconFileExport,
  'import': IconFileImport,
  'volume': IconVolume,
  'volume-off': IconVolumeOff,
  'play': IconPlayerPlay,
  'pause': IconPlayerPause,
  'stop': IconPlayerStop,
  'copy': IconCopy,
  'check': IconCheck,
  'close': IconX,
  'chevron-down': IconChevronDown,
  'chevron-up': IconChevronUp,
  'search': IconSearch,
  'home': IconHome,
  'book': IconBook,
  'help': IconHelp,
  'info': IconInfoCircle,
  'warning': IconAlertTriangle,
  'error': IconAlertCircle,
  'success': IconCircleCheck,
  'heart': IconHeart,
  'favorite': IconHeart,
  'storage': IconDatabase,
  'keyboard': IconKeyboard,
  'web': IconWorld,
  'select-all': IconCursorText,
  'tool': IconTool,
  'manufacturing': IconTool,
  
  // 缺失的图标
  'volume-2': IconVolume2,
  'star': IconStar,
  'star-filled': IconStarFilled,
  'loader': IconLoader,
  'swap': IconArrowsLeftRight,
};

const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 16, 
  color, 
  className, 
  style 
}) => {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return <IconHelp size={size} color={color} className={className} style={style} />;
  }
  
  return (
    <IconComponent 
      size={size} 
      color={color} 
      className={className} 
      style={style} 
    />
  );
};

export default Icon;
