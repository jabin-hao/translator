import React from 'react'
import Bing from '@lobehub/icons/es/Bing/components/Color'
import Claude from '@lobehub/icons/es/Claude/components/Mono'
import DeepL from '@lobehub/icons/es/DeepL/components/Color'
import DeepSeek from '@lobehub/icons/es/DeepSeek/components/Color'
import Gemini from '@lobehub/icons/es/Gemini/components/Color'
import Google from '@lobehub/icons/es/Google/components/Color'
import Mistral from '@lobehub/icons/es/Mistral/components/Color'
import Moonshot from '@lobehub/icons/es/Moonshot/components/Mono'
import Ollama from '@lobehub/icons/es/Ollama/components/Mono'
import OpenAI from '@lobehub/icons/es/OpenAI/components/Mono'
import Qwen from '@lobehub/icons/es/Qwen/components/Color'
import XAI from '@lobehub/icons/es/XAI/components/Mono'
import Yandex from '@lobehub/icons/es/Yandex/components/Mono'

import { getProviderOption } from '~lib/constants/customEngines'

interface BrandBadgeIconProps {
  brand: string
  size?: number
  fallbackText?: string
}

type IconComponent = React.ComponentType<{
  size?: string | number
  color?: string
  title?: string
}>

const iconMap: Record<string, IconComponent> = {
  bing: Bing,
  google: Google,
  deepl: DeepL,
  yandex: Yandex,
  openai: OpenAI,
  anthropic: Claude,
  gemini: Gemini,
  deepseek: DeepSeek,
  moonshot: Moonshot,
  qwen: Qwen,
  mistral: Mistral,
  xai: XAI,
  ollama: Ollama,
}

const BrandBadgeIcon: React.FC<BrandBadgeIconProps> = ({
  brand,
  size = 18,
  fallbackText,
}) => {
  const Icon = iconMap[brand]

  if (Icon) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        <Icon size={size} title={brand} />
      </span>
    )
  }

  const provider = getProviderOption((brand || 'custom-api') as never)
  const text = fallbackText || provider.monogram || brand.slice(0, 2).toUpperCase()

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        flexShrink: 0,
        fontSize: Math.max(9, Math.round(size * 0.48)),
        fontWeight: 700,
        borderRadius: Math.max(6, Math.round(size * 0.32)),
        background: provider.color,
        color: '#ffffff',
      }}
    >
      {text}
    </span>
  )
}

export default BrandBadgeIcon
