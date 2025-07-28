import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: string | number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabPanelProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'minimal' | 'pills';
  size?: 'sm' | 'md' | 'lg';
}

const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  defaultTab,
  onChange,
  className = '',
  variant = 'default',
  size = 'md'
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  const variantClasses = {
    default: {
      container: 'border-b border-gray-200',
      tab: 'border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700',
      activeTab: 'border-blue-500 text-blue-600',
      content: 'py-4'
    },
    minimal: {
      container: 'border-b border-gray-100',
      tab: 'border-b border-transparent hover:border-gray-200 hover:text-gray-600',
      activeTab: 'border-gray-400 text-gray-900',
      content: 'py-3'
    },
    pills: {
      container: 'bg-gray-100 rounded-lg p-1',
      tab: 'rounded-md hover:bg-white hover:shadow-sm',
      activeTab: 'bg-white shadow-sm text-gray-900',
      content: 'py-4'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const classes = variantClasses[variant];

  return (
    <div className={className}>
      {/* Tab Navigation */}
      <div className={`flex space-x-1 ${classes.container}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              ${sizeClasses[size]}
              ${classes.tab}
              ${activeTab === tab.id ? classes.activeTab : 'text-gray-500'}
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              font-medium transition-colors duration-200 flex items-center space-x-2
            `}
          >
            {tab.icon && (
              <span className="flex-shrink-0">
                {tab.icon}
              </span>
            )}
            <span className="truncate">{tab.label}</span>
            {tab.badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={classes.content}>
        {activeTabContent}
      </div>
    </div>
  );
};

export default TabPanel;