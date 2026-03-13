import React from 'react'

import { getProviderOption } from '~lib/constants/customEngines'
import type { CustomEngineProvider } from '~lib/constants/types'

import BrandBadgeIcon from './BrandBadgeIcon'

interface ProviderBrandIconProps {
  provider: CustomEngineProvider
  size?: number
}

const ProviderBrandIcon: React.FC<ProviderBrandIconProps> = ({
  provider,
  size = 18,
}) => {
  const option = getProviderOption(provider)

  return (
    <BrandBadgeIcon
      brand={provider}
      size={size}
      fallbackText={option.monogram}
    />
  )
}

export default ProviderBrandIcon
