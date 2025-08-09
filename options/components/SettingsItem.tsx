import React from 'react';
import { Typography, Space } from 'antd';
import { useTheme } from '~lib/utils/theme';

const { Text } = Typography;

interface SettingsItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  label, 
  description, 
  children,
  style 
}) => {
  const { isDark } = useTheme();

  return (
    <div style={{ 
      marginBottom: 32,
      ...style 
    }}>
      <div style={{ 
        display: 'flex',
        alignItems: 'flex-start',
        gap: 24
      }}>
        {/* 标签区域 */}
        <div style={{ 
          width: 240,
          paddingTop: 4,
          flexShrink: 0
        }}>
          <Text style={{ 
            fontSize: 15,
            fontWeight: 600,
            color: isDark ? '#ffffff' : '#1f1f1f',
            display: 'block',
            marginBottom: description ? 4 : 0
          }}>
            {label}
          </Text>
          {description && (
            <Text style={{ 
              fontSize: 13,
              color: isDark ? '#a6a6a6' : '#666666',
              lineHeight: 1.4,
              wordBreak: 'break-word'
            }}>
              {description}
            </Text>
          )}
        </div>

        {/* 控件区域 */}
        <div style={{ 
          flex: 1,
          minWidth: 0
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsItem;
