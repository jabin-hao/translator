import React from 'react'

import BrandBadgeIcon from './BrandBadgeIcon'

interface EngineBrandIconProps {
  engine: string
  size?: number
}

const EngineBrandIcon: React.FC<EngineBrandIconProps> = ({
  engine,
  size = 18,
}) => {
  return <BrandBadgeIcon brand={engine} size={size} fallbackText={engine.slice(0, 2).toUpperCase()} />
}

export default EngineBrandIcon
