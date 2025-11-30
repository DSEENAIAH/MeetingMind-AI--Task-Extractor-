import React from 'react';

interface TeamTabsProps {
    activeTab: 'dashboard' | 'extract' | 'tasks';
    onTabChange: (tab: 'dashboard' | 'extract' | 'tasks') => void;
    isAdmin: boolean;
}

const TeamTabs: React.FC<TeamTabsProps> = ({ activeTab, onTabChange, isAdmin }) => {
    return (
        <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {isAdmin && (
                    <button
                        onClick={() => onTabChange('dashboard')}
                        className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === 'dashboard'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                    >
                        Dashboard
                    </button>
                )}
                <button
                    onClick={() => onTabChange('tasks')}
                    className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === 'tasks'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                >
                    Tasks
                </button>
                {isAdmin && (
                    <button
                        onClick={() => onTabChange('extract')}
                        className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === 'extract'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                    >
                        Extract Tasks
                    </button>
                )}
            </nav>
        </div>
    );
};

export default TeamTabs;
