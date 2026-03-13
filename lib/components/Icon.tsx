import React from "react"
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowsLeftRight,
  IconBook,
  IconBrandEdge,
  IconBrandGithub,
  IconBrandGoogle,
  IconBrandYandex,
  IconBrightnessAuto,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconCopy,
  IconCursorText,
  IconDatabase,
  IconDownload,
  IconEdit,
  IconFileExport,
  IconFileImport,
  IconHeart,
  IconHelp,
  IconHome,
  IconInfoCircle,
  IconKeyboard,
  IconLanguage,
  IconLoader,
  IconMoon,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconStar,
  IconStarFilled,
  IconSun,
  IconTool,
  IconTrash,
  IconUpload,
  IconVolume,
  IconVolume2,
  IconVolumeOff,
  IconWorld,
  IconX,
} from "@tabler/icons-react"

interface IconProps {
  name: string
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

type IconComponentProps = {
  size?: string | number
  color?: string
  className?: string
  style?: React.CSSProperties
}

type IconComponent = React.ComponentType<IconComponentProps>

// Keep the lookup table declarative so missing icons are the only runtime branch.
const iconMap: Record<string, IconComponent> = {
  "brand-google": IconBrandGoogle,
  "brand-edge": IconBrandEdge,
  "brand-yandex": IconBrandYandex,
  "brand-github": IconBrandGithub,
  language: IconLanguage,
  translate: IconLanguage,
  settings: IconSettings,
  "brightness-auto": IconBrightnessAuto,
  sun: IconSun,
  moon: IconMoon,
  reload: IconRefresh,
  plus: IconPlus,
  edit: IconEdit,
  delete: IconTrash,
  download: IconDownload,
  upload: IconUpload,
  export: IconFileExport,
  import: IconFileImport,
  volume: IconVolume,
  "volume-2": IconVolume2,
  "volume-off": IconVolumeOff,
  play: IconPlayerPlay,
  pause: IconPlayerPause,
  stop: IconPlayerStop,
  copy: IconCopy,
  check: IconCheck,
  close: IconX,
  "chevron-down": IconChevronDown,
  "chevron-up": IconChevronUp,
  search: IconSearch,
  home: IconHome,
  book: IconBook,
  help: IconHelp,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  error: IconAlertCircle,
  success: IconCircleCheck,
  heart: IconHeart,
  favorite: IconHeart,
  storage: IconDatabase,
  keyboard: IconKeyboard,
  web: IconWorld,
  "select-all": IconCursorText,
  tool: IconTool,
  manufacturing: IconTool,
  star: IconStar,
  "star-filled": IconStarFilled,
  loader: IconLoader,
  swap: IconArrowsLeftRight,
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  color,
  className,
  style,
}) => {
  const IconComponent = iconMap[name]

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`)
    return (
      <IconHelp
        size={size}
        color={color}
        className={className}
        style={style}
      />
    )
  }

  return (
    <IconComponent
      size={size}
      color={color}
      className={className}
      style={style}
    />
  )
}

export default Icon
