import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  AlertCircle,
  Upload,
  ChevronDown,
  Trophy,
  TrendingUp,
  Users2,
  Scan,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';
import { useCurrency } from '@/contexts/CurrencyContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: 'red' | 'blue' | 'green' | 'yellow';
  children?: NavItem[];
}

interface SidebarProps {
  issuesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ issuesCount = 0 }) => {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['Analytics']);
  const { currency, setCurrency } = useCurrency();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Advocates',
      href: '/advocates',
      icon: Users,
    },
    {
      name: 'Brands',
      href: '/brands',
      icon: Building2,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      children: [
        { name: 'Champions', href: '/analytics/champions', icon: Trophy },
        { name: 'Segments', href: '/analytics/segments', icon: Users2 },
        { name: 'Outliers', href: '/analytics/outliers', icon: TrendingUp },
        { name: 'Platform Fit', href: '/analytics/platform-fit', icon: Scan },
        { name: 'Settings', href: '/analytics/settings', icon: Settings },
      ],
    },
    {
      name: 'Data Quality',
      href: '/data-quality',
      icon: AlertCircle,
      badge: issuesCount > 0 ? issuesCount : undefined,
      badgeColor: 'red',
    },
    {
      name: 'Imports',
      href: '/imports',
      icon: Upload,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(href);
  };

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const getBadgeColor = (color?: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-600';
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo/Brand */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">Advocacy Platform</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.name);
          const active = isActive(item.href);

          return (
            <div key={item.name}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={clsx(
                    'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                  <ChevronDown
                    className={clsx(
                      'w-4 h-4 transition-transform',
                      isExpanded && 'transform rotate-180'
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={clsx(
                        'px-2 py-0.5 text-xs font-semibold rounded-full',
                        getBadgeColor(item.badgeColor)
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children!.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={clsx(
                        'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                        isActive(child.href)
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <child.icon className="w-4 h-4 mr-3" />
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <span>{currency}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-0 bottom-full mb-2 w-24 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <button
                    onClick={() => {
                      setCurrency('GBP');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      currency === 'GBP' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    GBP
                  </button>
                  <button
                    onClick={() => {
                      setCurrency('USD');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      currency === 'USD' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    USD
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

