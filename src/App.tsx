/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Category, MenuItem, UserProfile, ActivityLog } from './types';
import {
  subscribeCategories,
  subscribeMenuItems,
  seedInitialMenuIfEmpty,
} from './services/menuService';
import { subscribeAuth, logoutUser } from './services/authService';
import { subscribeActivityLogs } from './services/logService';
import { PublicMenuCard } from './components/PublicMenuCard';
import { OwnerLogin } from './components/OwnerLogin';
import { OwnerDashboard } from './components/OwnerDashboard';
import { QrCodeView } from './components/QrCodeView';

type ViewRoute = 'menu' | 'login' | 'forgot' | 'reset' | 'owner' | 'qr';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewRoute>('menu');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync hash routing (e.g. #owner, #login, #forgot-password, #reset-password, #qr, #menu)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const urlParams = new URLSearchParams(window.location.search);
      const isResetAction = urlParams.get('mode') === 'resetPassword' || hash.includes('reset-password');

      if (hash === 'owner' || path.includes('/owner')) {
        setCurrentView('owner');
      } else if (isResetAction) {
        setCurrentView('reset');
      } else if (hash === 'forgot-password' || hash === 'forgot') {
        setCurrentView('forgot');
      } else if (hash === 'login' || path.includes('/login')) {
        setCurrentView('login');
      } else if (hash === 'qr' || path.includes('/qr')) {
        setCurrentView('qr');
      } else {
        setCurrentView('menu');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (view: ViewRoute) => {
    setCurrentView(view);
    window.location.hash = view === 'menu' ? '' : `#${view}`;
  };

  // Subscriptions & initial data
  useEffect(() => {
    // Attempt Firestore initial seed if empty
    seedInitialMenuIfEmpty().catch(console.warn);

    // Subscribe to live categories
    const unsubCats = subscribeCategories((cats) => {
      setCategories(cats);
    });

    // Subscribe to live menu items
    const unsubItems = subscribeMenuItems((items) => {
      setMenuItems(items);
      setIsLoading(false);
    });

    // Subscribe to activity logs
    const unsubLogs = subscribeActivityLogs((logs) => {
      setActivityLogs(logs);
    });

    // Subscribe to auth state
    const unsubAuth = subscribeAuth((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubCats();
      unsubItems();
      unsubLogs();
      unsubAuth();
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    navigateTo('menu');
  };

  // Render correct view based on state
  return (
    <div className="w-full min-h-screen bg-[#0e0603] text-[#f5efe6]">
      {/* 1. Table QR Station View */}
      {currentView === 'qr' && (
        <QrCodeView
          onBackToMenu={() => navigateTo('menu')}
          isOwnerView={!!currentUser}
        />
      )}

      {/* 2. Owner & Staff Login / Password Recovery / Reset */}
      {(currentView === 'login' || currentView === 'forgot' || currentView === 'reset') && (
        <OwnerLogin
          initialMode={currentView === 'reset' ? 'reset' : currentView === 'forgot' ? 'forgot' : 'login'}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            navigateTo('owner');
          }}
          onBackToMenu={() => navigateTo('menu')}
        />
      )}

      {/* 3. Owner Dashboard */}
      {currentView === 'owner' && (
        currentUser ? (
          <OwnerDashboard
            currentUser={currentUser}
            categories={categories}
            menuItems={menuItems}
            activityLogs={activityLogs}
            onLogout={handleLogout}
            onViewPublicMenu={() => navigateTo('menu')}
          />
        ) : (
          <OwnerLogin
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              navigateTo('owner');
            }}
            onBackToMenu={() => navigateTo('menu')}
          />
        )
      )}

      {/* 4. Public Customer Menu Card (Primary Landing View) */}
      {currentView === 'menu' && (
        <PublicMenuCard
          categories={categories}
          menuItems={menuItems}
          onOpenOwnerLogin={() => {
            if (currentUser) {
              navigateTo('owner');
            } else {
              navigateTo('login');
            }
          }}
          onOpenQrModal={() => navigateTo('qr')}
        />
      )}
    </div>
  );
}
