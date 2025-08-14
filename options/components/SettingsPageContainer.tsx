import React from 'react';
import { Card, Typography } from 'antd';
import { useTheme } from '~lib/theme/theme';

const { Title } = Typography;

interface SettingsPageContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingsPageContainer: React.FC<SettingsPageContainerProps> = ({ 
  title, 
  description, 
  children 
}) => {
  const { isDark } = useTheme();

  return (
    <div style={{ 
      padding: '32px 40px',
      background: isDark ? '#141414' : '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* 页面标题区域 */}
      <div style={{ 
        marginBottom: 32,
        paddingBottom: 24,
        borderBottom: `2px solid ${isDark ? '#303030' : '#e8e8e8'}`
      }}>
        <Title 
          level={2} 
          style={{ 
            margin: 0,
            marginBottom: description ? 8 : 0,
            color: isDark ? '#ffffff' : '#1f1f1f',
            fontWeight: 600,
            fontSize: 28
          }}
        >
          {title}
        </Title>
        {description && (
          <div style={{ 
            color: isDark ? '#a6a6a6' : '#666666',
            fontSize: 16,
            lineHeight: 1.5
          }}>
            {description}
          </div>
        )}
      </div>

      {/* 内容卡片 */}
      <Card
        style={{
          background: isDark ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${isDark ? '#424242' : '#e8e8e8'}`,
          borderRadius: 12,
          boxShadow: isDark 
            ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
            : '0 4px 12px rgba(0, 0, 0, 0.08)',
        }}
        styles={{
          body: { 
            padding: '32px 40px',
            fontSize: 14,
            lineHeight: 1.6
          }
        }}
      >
        {children}
      </Card>
    </div>
  );
};

export default SettingsPageContainer;
