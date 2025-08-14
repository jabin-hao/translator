import React from 'react';
import { Typography, Divider } from 'antd';
import { useTheme } from '~lib/theme/theme';

const { Title } = Typography;

interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
  first?: boolean;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ 
  title, 
  children,
  first = false 
}) => {
  const { isDark } = useTheme();

  return (
    <div style={{ marginBottom: 40 }}>
      {!first && (
        <Divider style={{ 
          margin: '40px 0 32px 0',
          borderColor: isDark ? '#424242' : '#e8e8e8'
        }} />
      )}
      
      {title && (
        <Title 
          level={4} 
          style={{ 
            margin: '0 0 24px 0',
            color: isDark ? '#ffffff' : '#1f1f1f',
            fontWeight: 600,
            fontSize: 18
          }}
        >
          {title}
        </Title>
      )}
      
      {children}
    </div>
  );
};

export default SettingsGroup;
