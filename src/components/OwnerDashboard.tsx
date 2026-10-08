import React, { useState, useEffect } from 'react';
import {
  Category,
  MenuItem,
  UserProfile,
  UserRole,
  CafeSettings,
  ActivityLog,
} from '../types';
import {
  addCategory,
  updateCategory,
  deleteCategory,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  resetMenuToDefaults,
} from '../services/menuService';
import {
  fetchAllUsers,
  createUser,
  updateUserProfile,
  toggleUserActive,
  deleteUser,
  getLocalSettings,
  saveSettings,
  verifyBackupEmail,
  requestBackupEmailOtp,
  changeUserPassword,
  updatePrimaryOwnerEmail,
  updatePrimaryOwnerId,
  DEFAULT_PERMISSIONS,
} from '../services/authService';
import { logActivity, clearAllActivityLogs, exportActivityLogsToExcel } from '../services/logService';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Tags,
  Users,
  QrCode,
  Shield,
  History,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Search,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { QrCodeView } from './QrCodeView';
import { ChaiDenLogo } from './ChaiDenLogo';

interface OwnerDashboardProps {
  currentUser: UserProfile;
  categories: Category[];
  menuItems: MenuItem[];
  activityLogs: ActivityLog[];
  onLogout: () => void;
  onViewPublicMenu: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  currentUser,
  categories,
  menuItems,
  activityLogs,
  onLogout,
  onViewPublicMenu,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'items' | 'categories' | 'users' | 'qr' | 'security' | 'logs'
  >('overview');

  // Permission checks
  const isOwner = currentUser.role === 'OWNER';
  const isCoOwner = currentUser.role === 'CO_OWNER';
  const isManager = currentUser.role === 'MANAGER';

  const canEditPrices = currentUser.permissions.canEditPrices || isOwner || isCoOwner || isManager;
  const canAddItems = currentUser.permissions.canAddItems || isOwner || isCoOwner || isManager;
  const canEditItems = currentUser.permissions.canEditItems || isOwner || isCoOwner || isManager;
  const canDeleteItems = currentUser.permissions.canDeleteItems || isOwner || isCoOwner;
  const canManageCategories = currentUser.permissions.canManageCategories || isOwner || isCoOwner || isManager;
  const canManageUsers = isOwner || isCoOwner; // Owner and Co-Owner have equal access to manage users & change passwords
  const canManageSecurity = isOwner || isCoOwner; // Both Owner and Co-Owner can change passwords

  // Filter/Search states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchItemTerm, setSearchItemTerm] = useState<string>('');

  // Item Form Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    categoryId: '',
    price: 30,
    description: '',
    image: '',
    isNew: false,
    isVeg: true,
    active: true,
    displayOrder: 1,
  });

  // Quick Inline Price Editing
  const [quickPriceEditId, setQuickPriceEditId] = useState<string | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState<number>(0);

  // Category Form Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catFormData, setCatFormData] = useState({
    name: '',
    color: '#8C4307',
    image: '',
    displayOrder: 1,
    active: true,
  });

  // Users State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'STAFF' as UserRole,
    password: '',
    permissions: { ...DEFAULT_PERMISSIONS.STAFF },
  });
  const [showUserPassword, setShowUserPassword] = useState(false);

  // Password Change in Security Tab (Owner & Co-Owner)
  const [selectedPasswordTarget, setSelectedPasswordTarget] = useState<'owner' | 'self'>('owner');
  const [ownerNewPassword, setOwnerNewPassword] = useState('');
  const [showOwnerNewPassword, setShowOwnerNewPassword] = useState(false);

  // Settings & Security State
  const [settings, setSettings] = useState<CafeSettings>(getLocalSettings());

  // Dynamic Primary Owner Info (Synchronized whenever owner email changes)
  const primaryOwnerEmail =
    settings.primaryOwnerEmail ||
    usersList.find((u) => u.role === 'OWNER')?.email ||
    'cherry1011705897@gmail.com';
  const ownerUser =
    usersList.find((u) => u.email.toLowerCase() === primaryOwnerEmail.toLowerCase()) ||
    usersList.find((u) => u.role === 'OWNER');
  const ownerDisplayName = ownerUser?.name || 'The Chai Den Owner';

  const [ownerGmailInput, setOwnerGmailInput] = useState('');
  const [ownerGmailUpdating, setOwnerGmailUpdating] = useState(false);
  const [backupEmailInput, setBackupEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState<string | null>(null);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string | null>(null);

  // Status banners
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Safe in-app confirmation modal (avoids iframe window.confirm sandbox blocks)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    isDestructive: false,
    onConfirm: () => {},
  });

  const showBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 3500);
  };

  useEffect(() => {
    fetchAllUsers().then((list) => setUsersList(list));
    setSettings(getLocalSettings());
  }, []);

  // Handle Quick Price Update
  const handleSaveQuickPrice = async (itemId: string) => {
    if (quickPriceValue < 0) return;
    const item = menuItems.find((i) => i.id === itemId);
    if (!item) return;

    await updateMenuItem(itemId, { price: quickPriceValue });
    await logActivity(
      'Price Changed',
      `${item.name}: ${item.price}/- → ${quickPriceValue}/-`,
      currentUser.email
    );
    setQuickPriceEditId(null);
    showBanner(`Price for "${item.name}" updated to ${quickPriceValue}/-`);
  };

  // Open Item Modal (Add or Edit)
  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemFormData({
        name: item.name,
        categoryId: item.categoryId,
        price: item.price,
        description: item.description || '',
        image: item.image || '',
        isNew: !!item.isNew,
        isVeg: item.isVeg !== false,
        active: item.active,
        displayOrder: item.displayOrder,
      });
    } else {
      setEditingItem(null);
      setItemFormData({
        name: '',
        categoryId: categories[0]?.id || '',
        price: 30,
        description: '',
        image: '',
        isNew: false,
        isVeg: true,
        active: true,
        displayOrder: (menuItems.length || 0) + 1,
      });
    }
    setItemModalOpen(true);
  };

  // Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name.trim() || !itemFormData.categoryId) return;

    if (editingItem) {
      await updateMenuItem(editingItem.id, itemFormData);
      await logActivity('Menu Item Updated', itemFormData.name, currentUser.email);
      showBanner(`Updated "${itemFormData.name}" successfully.`);
    } else {
      await addMenuItem(itemFormData);
      await logActivity('Menu Item Added', itemFormData.name, currentUser.email);
      showBanner(`Added new product "${itemFormData.name}".`);
    }
    setItemModalOpen(false);
  };

  // Delete Item
  const handleDeleteItem = (item: MenuItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Menu Product',
      message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Product',
      isDestructive: true,
      onConfirm: async () => {
        await deleteMenuItem(item.id);
        await logActivity('Menu Item Deleted', item.name, currentUser.email);
        showBanner(`Deleted "${item.name}".`);
      },
    });
  };

  // Open Category Modal
  const openCatModal = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat);
      setCatFormData({
        name: cat.name,
        color: cat.color,
        image: cat.image || '',
        displayOrder: cat.displayOrder,
        active: cat.active,
      });
    } else {
      setEditingCat(null);
      setCatFormData({
        name: '',
        color: '#8C4307',
        image: '',
        displayOrder: categories.length + 1,
        active: true,
      });
    }
    setCatModalOpen(true);
  };

  // Save Category
  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormData.name.trim()) return;

    if (editingCat) {
      await updateCategory(editingCat.id, catFormData);
      await logActivity('Category Updated', catFormData.name, currentUser.email);
      showBanner(`Updated category "${catFormData.name}".`);
    } else {
      await addCategory(catFormData);
      await logActivity('Category Created', catFormData.name, currentUser.email);
      showBanner(`Created category "${catFormData.name}".`);
    }
    setCatModalOpen(false);
  };

  // Delete Category with items check
  const handleDeleteCat = (cat: Category) => {
    const associatedItems = menuItems.filter((i) => i.categoryId === cat.id);
    const message = associatedItems.length > 0
      ? `Warning: Category "${cat.name}" has ${associatedItems.length} products associated with it. Deleting this category will leave these items uncategorized. Proceed?`
      : `Are you sure you want to delete category "${cat.name}"?`;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message,
      confirmLabel: 'Delete Category',
      isDestructive: true,
      onConfirm: async () => {
        await deleteCategory(cat.id);
        await logActivity('Category Deleted', cat.name, currentUser.email);
        showBanner(`Deleted category "${cat.name}".`);
      },
    });
  };

  // Open User Modal (Add or Edit)
  const openUserModal = (user?: UserProfile) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        password: user.password || '',
        permissions: { ...user.permissions },
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: '',
        email: '',
        role: 'STAFF',
        password: '',
        permissions: { ...DEFAULT_PERMISSIONS.STAFF },
      });
    }
    setShowUserPassword(false);
    setUserModalOpen(true);
  };

  // Handle User Save (Create or Edit - Support Adding New Owner and Changing Gmail)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = userFormData.email.trim().toLowerCase();
    if (!cleanEmail || !userFormData.name.trim()) return;

    if (editingUser) {
      const emailChanged = cleanEmail !== editingUser.email.toLowerCase();
      const isOwnerAccount = editingUser.role === 'OWNER' || userFormData.role === 'OWNER';

      // Update existing user
      await updateUserProfile(editingUser.userId, {
        name: userFormData.name.trim(),
        email: cleanEmail,
        role: userFormData.role,
        permissions: userFormData.permissions,
        ...(userFormData.password ? { password: userFormData.password } : {}),
      });

      if (emailChanged && isOwnerAccount) {
        await saveSettings({ primaryOwnerEmail: cleanEmail });
        setSettings((prev) => ({ ...prev, primaryOwnerEmail: cleanEmail }));
      }

      setUsersList((prev) =>
        prev.map((u) =>
          u.userId === editingUser.userId
            ? {
                ...u,
                name: userFormData.name.trim(),
                email: cleanEmail,
                role: userFormData.role,
                permissions: userFormData.permissions,
                ...(userFormData.password ? { password: userFormData.password } : {}),
              }
            : u
        )
      );
      showBanner(`Updated account for ${userFormData.name} (${userFormData.role})`);
    } else {
      // Create new user (Owner, Co-Owner, Manager, Staff)
      const created = await createUser(
        userFormData.name.trim(),
        cleanEmail,
        userFormData.role,
        userFormData.permissions,
        userFormData.password
      );
      setUsersList([...usersList, created]);
      showBanner(`Created new ${userFormData.role} account for ${cleanEmail}`);
    }
    setUserModalOpen(false);
  };

  // Handle User Toggle Active
  const handleToggleUser = async (userId: string, currentActive: boolean) => {
    const target = usersList.find((u) => u.userId === userId);
    const activeOwnersCount = usersList.filter((u) => u.role === 'OWNER' && u.active).length;
    if (target?.role === 'OWNER' && currentActive && activeOwnersCount <= 1) {
      showBanner('At least one Owner account must remain active.');
      return;
    }
    await toggleUserActive(userId, !currentActive);
    setUsersList(
      usersList.map((u) => (u.userId === userId ? { ...u, active: !currentActive } : u))
    );
    showBanner(`User ${target?.name || ''} ${!currentActive ? 'enabled' : 'disabled'}`);
  };

  // Handle User Delete
  const handleDeleteUser = (userId: string) => {
    const target = usersList.find((u) => u.userId === userId);
    const totalOwnersCount = usersList.filter((u) => u.role === 'OWNER').length;
    if (target?.role === 'OWNER' && totalOwnersCount <= 1) {
      showBanner('The primary Owner account cannot be deleted. There must be at least one Owner.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete User Account',
      message: `Are you sure you want to delete account "${target?.name}" (${target?.role} - ${target?.email})?`,
      confirmLabel: 'Delete Account',
      isDestructive: true,
      onConfirm: async () => {
        await deleteUser(userId);
        setUsersList(usersList.filter((u) => u.userId !== userId));
        showBanner(`Removed user account ${target?.name}.`);
      },
    });
  };

  // Handle Registered Owner ID / Gmail Update
  const handleUpdateOwnerGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ownerGmailInput.trim();
    if (!clean) {
      showBanner('Please enter a valid Primary Owner ID or Gmail address.');
      return;
    }

    setOwnerGmailUpdating(true);
    try {
      if (clean.includes('@')) {
        await updatePrimaryOwnerEmail(clean.toLowerCase(), currentUser.email);
        setSettings((prev) => ({
          ...prev,
          primaryOwnerEmail: clean.toLowerCase(),
          primaryOwnerId: clean.toLowerCase(),
        }));
        setUsersList((prev) =>
          prev.map((u) =>
            u.role === 'OWNER' || u.userId === 'owner_primary' ? { ...u, email: clean.toLowerCase() } : u
          )
        );
      } else {
        await updatePrimaryOwnerId(clean, currentUser.email);
        setSettings((prev) => ({
          ...prev,
          primaryOwnerId: clean,
        }));
      }
      setOwnerGmailInput('');
      const successText = `Primary Owner ID updated to "${clean}". All users (Owner, Co-Owner, Manager, Staff) must now use this ID to sign in.`;
      setSecuritySuccessMsg(successText);
      showBanner(successText);
      setTimeout(() => setSecuritySuccessMsg(null), 6000);
    } catch (err: unknown) {
      showBanner(err instanceof Error ? err.message : 'Failed to update Primary Owner ID.');
    } finally {
      setOwnerGmailUpdating(false);
    }
  };

  // Activity Log: Export to Excel Sheet (.csv)
  const handleExportLogs = () => {
    if (!activityLogs || activityLogs.length === 0) {
      showBanner('No activity logs available to export.');
      return;
    }
    exportActivityLogsToExcel(activityLogs);
    showBanner(`Exported ${activityLogs.length} activity log entries to Excel spreadsheet (.csv)`);
  };

  // Activity Log: Clear Logs
  const handleClearLogs = () => {
    if (!activityLogs || activityLogs.length === 0) {
      showBanner('Activity log is already empty.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Clear System Activity Logs',
      message: 'Are you sure you want to permanently clear all system activity & audit log entries? This action cannot be undone.',
      confirmLabel: 'Clear All Logs',
      isDestructive: true,
      onConfirm: async () => {
        await clearAllActivityLogs();
        showBanner('All activity logs have been cleared successfully.');
      },
    });
  };

  // Change Password (Owner & Co-Owner Equal Access)
  const handleOwnerChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerNewPassword.trim() || ownerNewPassword.length < 6) {
      showBanner('Password must be at least 6 characters long.');
      return;
    }

    const isTargetingOwner = selectedPasswordTarget === 'owner';
    const targetOwner =
      usersList.find((u) => u.email.toLowerCase() === primaryOwnerEmail.toLowerCase()) ||
      usersList.find((u) => u.role === 'OWNER');
    const coOwnerUser = usersList.find(
      (u) => u.role === 'CO_OWNER' || u.email.toLowerCase() === 'coowner@chaiden.com'
    );

    const targetUserId = isTargetingOwner
      ? targetOwner?.userId || 'owner_primary'
      : (isCoOwner ? currentUser.userId : (coOwnerUser?.userId || 'co_owner_1'));

    const targetLabel = isTargetingOwner
      ? `${ownerDisplayName} (${primaryOwnerEmail})`
      : (isCoOwner
          ? `${currentUser.name} (${currentUser.role})`
          : (coOwnerUser ? `${coOwnerUser.name} (${coOwnerUser.email})` : 'The Chai Den Co-Owner'));

    await changeUserPassword(targetUserId, ownerNewPassword);
    
    // Update usersList in memory as well
    setUsersList((prev) =>
      prev.map((u) => (u.userId === targetUserId ? { ...u, password: ownerNewPassword } : u))
    );

    setOwnerNewPassword('');
    setSecuritySuccessMsg(`Password successfully updated for ${targetLabel}!`);
    showBanner(`Password successfully updated for ${targetLabel}!`);
    await logActivity(
      'Password Changed',
      `Updated login password for ${targetLabel} by ${currentUser.name} (${currentUser.role})`,
      currentUser.email
    );
    setTimeout(() => setSecuritySuccessMsg(null), 5000);
  };

  // Security: Request Backup OTP
  const handleRequestBackupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupEmailInput || !backupEmailInput.includes('@')) {
      showBanner('Please enter a valid backup email address.');
      return;
    }
    const res = await requestBackupEmailOtp(backupEmailInput);
    if (res.success) {
      setSimulatedOtpNotice(`Your 6-digit Chai Den verification code is: ${res.simulatedCode}`);
      setOtpStep(true);
    }
  };

  // Security: Verify Backup OTP
  const handleVerifyBackupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await verifyBackupEmail(otpInput);
    if (ok) {
      await saveSettings({ backupEmail: backupEmailInput, backupEmailVerified: true });
      setSettings(getLocalSettings());
      setOtpStep(false);
      setSimulatedOtpNotice(null);
      setSecuritySuccessMsg('Backup email verified and activated successfully!');
      showBanner('Backup email verified and activated successfully!');
      setTimeout(() => setSecuritySuccessMsg(null), 4000);
    } else {
      showBanner('Invalid 6-digit verification code. Please check and try again.');
    }
  };

  // Reset menu confirmation
  const handleResetDefaults = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Menu to Card Defaults',
      message: 'Reset all menu items and categories back to the authentic physical Chai Den menu card defaults?',
      confirmLabel: 'Reset Defaults',
      isDestructive: true,
      onConfirm: async () => {
        await resetMenuToDefaults();
        showBanner('Menu reset to authentic physical card defaults.');
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0e0603] text-[#f5efe6] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#140803] border-b md:border-b-0 md:border-r border-[#dfb76c]/30 flex flex-col justify-between p-4 shadow-2xl flex-shrink-0">
        <div>
          {/* Cafe Identity Header with Authentic Chai Den Logo */}
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[#dfb76c]/30">
            <ChaiDenLogo size="sm" showSubtitle={false} />
            <div>
              <h1 className="font-cinzel text-base font-extrabold text-gold-gradient tracking-wider leading-none">
                THE CHAI DEN
              </h1>
              <span className="text-[10px] tracking-widest uppercase text-[#dfb76c]/70 font-outfit mt-1 block">
                MANAGEMENT SYSTEM
              </span>
            </div>
          </div>

          {/* User Badge */}
          <div className="bg-[#1e0e07] border border-[#dfb76c]/30 rounded-xl p-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-cinzel text-[#fff4db] truncate">
                {currentUser.name}
              </span>
              <span className="text-[9px] font-outfit uppercase px-2 py-0.5 rounded-full bg-[#dfb76c] text-[#1c0e07] font-bold">
                {currentUser.role}
              </span>
            </div>
            <p className="text-[11px] text-[#dfb76c]/70 truncate mt-0.5 font-mono">
              {currentUser.email}
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-outfit font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#dfb76c] text-[#1c0e07] font-bold shadow'
                  : 'text-[#eedfca] hover:bg-[#200f07] hover:text-[#dfb76c]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('items')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-outfit font-medium transition-all ${
                activeTab === 'items'
                  ? 'bg-[#dfb76c] text-[#1c0e07] font-bold shadow'
                  : 'text-[#eedfca] hover:bg-[#200f07] hover:text-[#dfb76c]'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Menu Products ({menuItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-outfit font-medium transition-all ${
                activeTab === 'categories'
                  ? 'bg-[#dfb76c] text-[#1c0e07] font-bold shadow'
                  : 'text-[#eedfca] hover:bg-[#200f07] hover:text-[#dfb76c]'
              }`}
            >
              <Tags className="w-4 h-4" />
              <span>Categories ({categories.length})</span>
            </button>

            {canManageUsers && (
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-outfit font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-[#dfb76c] text-[#1c0e07] font-bold shadow'
                    : 'text-[#eedfca] hover:bg-[#200f07] hover:text-[#dfb76c]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Users & Roles</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('qr')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-outfit font-medium transition-all ${
                activeTab === 'qr'
                  ? 'bg-[#dfb76c] text-[#1c0e07] font-bold shadow'
                  : 'text-[#eedfca] hover:bg-[#200f07] hover:text-[#dfb76c]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Table QR Station</span>
            </button>

            {canManageSecurity && (
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-outfit font-medium transition-all ${
                  activeTab === 'security'
                    ? 'bg-[#dfb76c] text-[#1c0e07] font-bold shadow'
                    : 'text-[#eedfca] hover:bg-[#200f07] hover:text-[#dfb76c]'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>{isCoOwner ? 'Change Password' : 'Security & Password'}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-outfit font-medium transition-all ${
                activeTab === 'logs'
                  ? 'bg-[#dfb76c] text-[#1c0e07] font-bold shadow'
                  : 'text-[#eedfca] hover:bg-[#200f07] hover:text-[#dfb76c]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Activity Log</span>
            </button>
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#dfb76c]/30 space-y-2">
          <button
            onClick={onViewPublicMenu}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#221008] border border-[#dfb76c]/40 text-xs font-outfit text-[#dfb76c] hover:bg-[#32180c] hover:border-[#dfb76c] transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Public Menu</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-outfit text-red-300 hover:bg-red-900/60 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {/* Banner Alert */}
        {bannerMsg && (
          <div className="mb-6 p-3 rounded-xl bg-gradient-to-r from-[#dfb76c]/20 to-[#9e782f]/20 border border-[#dfb76c] text-xs font-outfit text-[#fff4db] flex items-center gap-2 shadow-lg animate-in fade-in">
            <Sparkles className="w-4 h-4 text-[#dfb76c] flex-shrink-0" />
            <span>{bannerMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfb76c]/30 pb-4">
              <div>
                <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
                  Cafe Operations Overview
                </h2>
                <p className="text-xs text-[#dfb76c]/80 font-outfit mt-1">
                  Synchronized with the physical Chai Den digital menu card
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onViewPublicMenu}
                  className="px-3.5 py-1.5 rounded-xl bg-[#dfb76c] text-[#1c0e07] font-bold text-xs font-outfit hover:bg-[#edd085] flex items-center gap-1.5 shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Live Menu
                </button>
                {isOwner && (
                  <button
                    onClick={handleResetDefaults}
                    className="px-3 py-1.5 rounded-xl bg-[#1e0e07] border border-[#dfb76c]/40 text-xs font-outfit text-[#dfb76c] hover:bg-[#2d160b] flex items-center gap-1"
                    title="Restore Menu Card Defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Card Defaults
                  </button>
                )}
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-xl p-4 shadow">
                <span className="text-[11px] font-outfit uppercase tracking-wider text-[#dfb76c]/70 block">
                  Total Products
                </span>
                <span className="font-cinzel text-3xl font-black text-[#f5e29f] mt-1 block">
                  {menuItems.length}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 block">
                  {menuItems.filter((i) => i.active).length} Active on Menu
                </span>
              </div>

              <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-xl p-4 shadow">
                <span className="text-[11px] font-outfit uppercase tracking-wider text-[#dfb76c]/70 block">
                  Categories
                </span>
                <span className="font-cinzel text-3xl font-black text-[#f5e29f] mt-1 block">
                  {categories.length}
                </span>
                <span className="text-[10px] text-[#dfb76c]/70 mt-1 block">
                  9 Physical Card Categories
                </span>
              </div>

              <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-xl p-4 shadow">
                <span className="text-[11px] font-outfit uppercase tracking-wider text-[#dfb76c]/70 block">
                  New Specials
                </span>
                <span className="font-cinzel text-3xl font-black text-amber-400 mt-1 block">
                  {menuItems.filter((i) => i.isNew).length}
                </span>
                <span className="text-[10px] text-amber-300 mt-1 block">
                  Highlighted with &apos;NEW&apos; badge
                </span>
              </div>

              <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-xl p-4 shadow">
                <span className="text-[11px] font-outfit uppercase tracking-wider text-[#dfb76c]/70 block">
                  Logged In As
                </span>
                <span className="font-cinzel text-2xl font-black text-emerald-400 mt-1 block">
                  {currentUser.role}
                </span>
                <span className="text-[10px] text-emerald-300 mt-1 block truncate">
                  {currentUser.email}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl p-5">
              <h3 className="font-cinzel text-lg font-bold text-[#fff4db] mb-3">
                Quick Cafe Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {canAddItems && (
                  <button
                    onClick={() => openItemModal()}
                    className="p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/40 hover:border-[#dfb76c] text-left transition flex items-center gap-3"
                  >
                    <Plus className="w-5 h-5 text-[#dfb76c]" />
                    <div>
                      <span className="text-xs font-bold font-outfit text-[#f5efe6] block">
                        Add Menu Product
                      </span>
                      <span className="text-[10px] text-[#dfb76c]/60">
                        Add tea, milkshake, cooler...
                      </span>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('qr')}
                  className="p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/40 hover:border-[#dfb76c] text-left transition flex items-center gap-3"
                >
                  <QrCode className="w-5 h-5 text-[#dfb76c]" />
                  <div>
                    <span className="text-xs font-bold font-outfit text-[#f5efe6] block">
                      Print Table Standees to PDF
                    </span>
                    <span className="text-[10px] text-[#dfb76c]/60">
                      Export table tents & PDF cards
                    </span>
                  </div>
                </button>

                {isOwner && (
                  <button
                    onClick={() => openUserModal()}
                    className="p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/40 hover:border-[#dfb76c] text-left transition flex items-center gap-3"
                  >
                    <Users className="w-5 h-5 text-[#dfb76c]" />
                    <div>
                      <span className="text-xs font-bold font-outfit text-[#f5efe6] block">
                        Create Staff Account
                      </span>
                      <span className="text-[10px] text-[#dfb76c]/60">
                        Add co-owner, manager, staff
                      </span>
                    </div>
                  </button>
                )}

                {isCoOwner && (
                  <button
                    onClick={() => setActiveTab('security')}
                    className="p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/40 hover:border-[#dfb76c] text-left transition flex items-center gap-3"
                  >
                    <KeyRound className="w-5 h-5 text-[#dfb76c]" />
                    <div>
                      <span className="text-xs font-bold font-outfit text-[#f5efe6] block">
                        Change Password
                      </span>
                      <span className="text-[10px] text-[#dfb76c]/60">
                        Update your Co-Owner login password
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MENU PRODUCTS MANAGEMENT */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfb76c]/30 pb-4">
              <div>
                <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
                  Menu Products & Live Prices
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[11px] font-outfit text-emerald-300 font-semibold shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Price Sync Active
                  </span>
                  <span className="text-xs text-[#dfb76c]/80 font-outfit">
                    Any price changed here automatically updates the public customer menu card instantly
                  </span>
                </div>
              </div>

              {canAddItems && (
                <button
                  onClick={() => openItemModal()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#dfb76c] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-wider font-outfit hover:brightness-110 flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Add New Product
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Filter by product name..."
                value={searchItemTerm}
                onChange={(e) => setSearchItemTerm(e.target.value)}
                className="flex-1 bg-[#160a04] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-xs text-[#f5efe6] placeholder-[#dfb76c]/40 focus:outline-none focus:border-[#dfb76c]"
              />

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-[#160a04] border border-[#dfb76c]/40 rounded-xl px-3 py-2 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Products Table */}
            <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#200f07] border-b border-[#dfb76c]/30 text-[11px] font-outfit uppercase tracking-wider text-[#dfb76c]">
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price (₹)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Special</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dfb76c]/20 text-xs font-outfit">
                    {menuItems
                      .filter((i) => {
                        const cat =
                          categories.find((c) => c.id === i.categoryId) ||
                          categories.find((c) =>
                            c.id
                              .toLowerCase()
                              .includes(i.categoryId.replace('cat_', '').toLowerCase())
                          );
                        const matchesCat =
                          selectedCategoryFilter === 'all' ||
                          i.categoryId === selectedCategoryFilter ||
                          cat?.id === selectedCategoryFilter;
                        const matchesQuery =
                          !searchItemTerm.trim() ||
                          i.name
                            .toLowerCase()
                            .includes(searchItemTerm.toLowerCase());
                        return matchesCat && matchesQuery;
                      })
                      .map((item) => {
                        const cat =
                          categories.find((c) => c.id === item.categoryId) ||
                          categories.find((c) =>
                            c.id
                              .toLowerCase()
                              .includes(item.categoryId.replace('cat_', '').toLowerCase())
                          );
                        const isQuickEditing = quickPriceEditId === item.id;

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-[#200f07]/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <span className="font-semibold text-[#f5efe6] block font-outfit text-sm leading-tight">
                                {item.name}
                              </span>
                              {item.description && (
                                <span className="text-[10px] text-[#dfb76c]/60 truncate block max-w-xs">
                                  {item.description}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm inline-block"
                                style={{ backgroundColor: cat?.color || '#8C4307' }}
                              >
                                {cat?.name || 'Uncategorized'}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {isQuickEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={quickPriceValue}
                                    onChange={(e) =>
                                      setQuickPriceValue(Number(e.target.value))
                                    }
                                    className="w-16 bg-[#26130a] border border-[#dfb76c] rounded px-1.5 py-0.5 text-xs text-[#f5efe6] focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveQuickPrice(item.id)}
                                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                    title="Save Price"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setQuickPriceEditId(null)}
                                    className="p-1 rounded bg-gray-700 text-white hover:bg-gray-600"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 group/price">
                                  <span className="font-cinzel font-bold text-[#f4d068] text-sm">
                                    {item.price}/-
                                  </span>
                                  {canEditPrices && (
                                    <button
                                      onClick={() => {
                                        setQuickPriceEditId(item.id);
                                        setQuickPriceValue(item.price);
                                      }}
                                      className="opacity-0 group-hover/price:opacity-100 text-[10px] text-[#dfb76c] hover:underline"
                                      title="Quick Change Price"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {canEditItems ? (
                                <button
                                  onClick={async () => {
                                    await updateMenuItem(item.id, { active: !item.active });
                                    showBanner(
                                      `"${item.name}" is now ${!item.active ? 'visible' : 'hidden'} on public menu.`
                                    );
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                                    item.active
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                                      : 'bg-red-950 text-red-300 border border-red-500/50'
                                  }`}
                                >
                                  {item.active ? 'Active' : 'Hidden'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-400">
                                  {item.active ? 'Active' : 'Hidden'}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {canEditItems ? (
                                <button
                                  onClick={async () => {
                                    await updateMenuItem(item.id, { isNew: !item.isNew });
                                    showBanner(
                                      `"${item.name}" NEW badge toggled to ${!item.isNew}.`
                                    );
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                                    item.isNew
                                      ? 'bg-red-600 text-white shadow'
                                      : 'bg-[#25130b] text-[#dfb76c]/50 border border-[#dfb76c]/20 hover:border-[#dfb76c]'
                                  }`}
                                >
                                  {item.isNew ? '★ NEW' : 'Regular'}
                                </button>
                              ) : (
                                <span>{item.isNew ? 'NEW' : '—'}</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {canEditItems && (
                                  <button
                                    onClick={() => openItemModal(item)}
                                    className="p-1.5 rounded-lg bg-[#25130b] border border-[#dfb76c]/30 text-[#dfb76c] hover:bg-[#381c10] hover:border-[#dfb76c]"
                                    title="Edit Product"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canDeleteItems && (
                                  <button
                                    onClick={() => handleDeleteItem(item)}
                                    className="p-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfb76c]/30 pb-4">
              <div>
                <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
                  Category Configuration
                </h2>
                <p className="text-xs text-[#dfb76c]/80 font-outfit mt-1">
                  Manage the 9 visual menu card categories and header color ribbons
                </p>
              </div>

              {canManageCategories && (
                <button
                  onClick={() => openCatModal()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#dfb76c] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-wider font-outfit hover:brightness-110 flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((cat) => {
                  const count = menuItems.filter(
                    (i) =>
                      i.categoryId === cat.id ||
                      i.categoryId
                        .toLowerCase()
                        .includes(cat.id.replace('cat_', '').toLowerCase())
                  ).length;
                  return (
                    <div
                      key={cat.id}
                      className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl p-4 shadow-xl relative overflow-hidden"
                    >
                      <div
                        className="h-2.5 -mx-4 -mt-4 mb-3"
                        style={{ backgroundColor: cat.color }}
                      />

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-cinzel text-lg font-bold text-[#fff4db]">
                            {cat.name}
                          </h3>
                          <span className="text-xs text-[#dfb76c]/70 font-outfit">
                            {count} {count === 1 ? 'Product' : 'Products'} Listed
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openCatModal(cat)}
                            className="p-1.5 rounded-lg bg-[#200f07] border border-[#dfb76c]/30 text-[#dfb76c] hover:border-[#dfb76c]"
                            title="Edit Category"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {canManageCategories && (
                            <button
                              onClick={() => handleDeleteCat(cat)}
                              className="p-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#dfb76c]/20 flex items-center justify-between text-xs text-[#dfb76c]/80">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/40"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-mono text-[10px]">{cat.color}</span>
                        </span>
                        <span>Order #{cat.displayOrder}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 4: USERS & ROLES - OWNER & CO-OWNER EQUAL ACCESS */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfb76c]/30 pb-4">
              <div>
                <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
                  User Accounts & Role Permissions
                </h2>
                <p className="text-xs text-[#dfb76c]/80 font-outfit mt-1">
                  Owner and Co-Owner have equal authority to create accounts, manage staff, and change passwords (including the Owner password)
                </p>
              </div>

              {(isOwner || isCoOwner) && (
                <button
                  onClick={() => openUserModal()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#dfb76c] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-wider font-outfit hover:brightness-110 flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Create User Account
                </button>
              )}
            </div>

            <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl overflow-hidden shadow-2xl">
              {/* Search Bar for Users & Roles */}
              <div className="p-3 sm:p-4 border-b border-[#dfb76c]/30 bg-[#200f07]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#dfb76c]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search accounts by name, email, or role (e.g. Owner, Ramesh, Staff)..."
                    className="w-full bg-[#180a04] border border-[#dfb76c]/40 rounded-xl pl-10 pr-9 py-2 text-xs text-[#f5efe6] placeholder-[#dfb76c]/50 focus:outline-none focus:border-[#dfb76c] font-outfit"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dfb76c]/60 hover:text-[#dfb76c]"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-outfit text-[#dfb76c]/80 flex-shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-[#180a04] border border-[#dfb76c]/30 font-mono">
                    Showing {usersList.filter((u) => {
                      if (!userSearchQuery.trim()) return true;
                      const term = userSearchQuery.toLowerCase().trim();
                      return (
                        (u.name && u.name.toLowerCase().includes(term)) ||
                        (u.email && u.email.toLowerCase().includes(term)) ||
                        (u.role && u.role.toLowerCase().includes(term))
                      );
                    }).length} of {usersList.length} accounts
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-outfit">
                  <thead>
                    <tr className="bg-[#200f07] border-b border-[#dfb76c]/30 text-[11px] uppercase tracking-wider text-[#dfb76c]">
                      <th className="py-3 px-4">Name & Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Permissions</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dfb76c]/20">
                    {usersList
                      .filter((u) => {
                        if (!userSearchQuery.trim()) return true;
                        const term = userSearchQuery.toLowerCase().trim();
                        return (
                          (u.name && u.name.toLowerCase().includes(term)) ||
                          (u.email && u.email.toLowerCase().includes(term)) ||
                          (u.role && u.role.toLowerCase().includes(term))
                        );
                      })
                      .map((user) => {
                      const isMainOwner =
                        user.email.toLowerCase() === primaryOwnerEmail.toLowerCase() ||
                        (user.role === 'OWNER' && !usersList.some((u) => u.email.toLowerCase() === primaryOwnerEmail.toLowerCase()));

                      return (
                        <tr key={user.userId} className="hover:bg-[#200f07]/50">
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#f5efe6] block">
                              {user.name} {isMainOwner && '👑 (Primary Owner)'}
                            </span>
                            <span className="text-[11px] text-[#dfb76c]/70 font-mono">
                              {user.email}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-[#dfb76c] text-[#1c0e07] font-bold text-[10px]">
                              {user.role}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <button
                              disabled={isMainOwner || !isOwner}
                              onClick={() => handleToggleUser(user.userId, user.active)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                                user.active
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                                  : 'bg-red-950 text-red-300 border border-red-500/50'
                              } ${isMainOwner ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                              {user.active ? 'Active' : 'Disabled'}
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs text-[9px]">
                              {user.permissions.canEditPrices && (
                                <span className="bg-[#25130b] text-[#dfb76c] px-1.5 py-0.5 rounded border border-[#dfb76c]/30">
                                  Prices
                                </span>
                              )}
                              {user.permissions.canAddItems && (
                                <span className="bg-[#25130b] text-[#dfb76c] px-1.5 py-0.5 rounded border border-[#dfb76c]/30">
                                  Add Items
                                </span>
                              )}
                              {user.permissions.canManageCategories && (
                                <span className="bg-[#25130b] text-[#dfb76c] px-1.5 py-0.5 rounded border border-[#dfb76c]/30">
                                  Categories
                                </span>
                              )}
                              {user.permissions.canManageSecurity && (
                                <span className="bg-[#25130b] text-[#dfb76c] px-1.5 py-0.5 rounded border border-[#dfb76c]/30">
                                  Security
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Button for Owner or Co-Owner to modify details & update password */}
                              {(isOwner || isCoOwner) && (
                                <button
                                  onClick={() => openUserModal(user)}
                                  className="p-1.5 rounded-lg bg-[#25130b] border border-[#dfb76c]/40 text-[#dfb76c] hover:bg-[#381c10] hover:border-[#dfb76c]"
                                  title={isMainOwner ? "Edit Owner & Change Password" : "Edit User & Password"}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isOwner && !isMainOwner && (
                                <button
                                  onClick={() => handleDeleteUser(user.userId)}
                                  className="p-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {usersList.filter((u) => {
                      if (!userSearchQuery.trim()) return true;
                      const term = userSearchQuery.toLowerCase().trim();
                      return (
                        (u.name && u.name.toLowerCase().includes(term)) ||
                        (u.email && u.email.toLowerCase().includes(term)) ||
                        (u.role && u.role.toLowerCase().includes(term))
                      );
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-[#dfb76c]/70 font-outfit">
                          <p>No user accounts found matching &quot;{userSearchQuery}&quot;</p>
                          <button
                            onClick={() => setUserSearchQuery('')}
                            className="mt-2 px-3 py-1 rounded-lg bg-[#200f07] border border-[#dfb76c]/40 text-[#f5e29f] text-[11px] hover:border-[#dfb76c]"
                          >
                            Clear Search
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: QR STATION */}
        {activeTab === 'qr' && (
          <div className="space-y-6">
            <QrCodeView
              onBackToMenu={() => setActiveTab('overview')}
              isOwnerView={true}
            />
          </div>
        )}

        {/* TAB 6: SECURITY & PASSWORD (OWNER & CO-OWNER) */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-2xl">
            <div className="border-b border-[#dfb76c]/30 pb-4">
              <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
                {isCoOwner ? 'Co-Owner Security & Password' : 'Security & Password Management'}
              </h2>
              <p className="text-xs text-[#dfb76c]/80 font-outfit mt-1">
                {isCoOwner
                  ? `Manage credentials and change password for ${currentUser.email}`
                  : 'Owner login credentials, password updates, and emergency backup recovery'}
              </p>
            </div>

            {/* Current Active Account Profile Badge */}
            <div className="p-3.5 rounded-xl bg-[#200f07] border border-[#dfb76c]/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-outfit tracking-wider text-[#dfb76c]/70 block">
                  Logged In Account
                </span>
                <span className="font-bold text-xs text-white">
                  {currentUser.name} <span className="text-[#dfb76c]/80">({isOwner ? primaryOwnerEmail : currentUser.email})</span>
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-cinzel bg-[#3a1d0d] text-[#f5e29f] border border-[#dfb76c]/50">
                {currentUser.role}
              </span>
            </div>

            {securitySuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{securitySuccessMsg}</span>
              </div>
            )}

            {/* Change Login Password */}
            <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#dfb76c]" />
                <h3 className="font-cinzel text-base font-bold text-[#fff4db]">
                  {isCoOwner ? 'Change Owner or Co-Owner Password' : 'Change Your Login Password'}
                </h3>
              </div>

              {/* Target Account Selector for Owner & Co-Owner (Equal Access) */}
              {(isOwner || isCoOwner) && (
                <div className="p-3.5 rounded-xl bg-[#200f07] border border-[#dfb76c]/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-outfit uppercase tracking-wider text-[#dfb76c] font-bold">
                      Select Account To Update Password:
                    </label>
                    <span className="text-[10px] text-amber-300 font-bold bg-[#381a0b] px-2 py-0.5 rounded border border-[#dfb76c]/40 flex items-center gap-1">
                      <span>👑</span>
                      <span>Equal Access</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-outfit">
                    <button
                      type="button"
                      onClick={() => setSelectedPasswordTarget('owner')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        selectedPasswordTarget === 'owner'
                          ? 'bg-[#3b1c0b] border-[#dfb76c] text-[#f5e29f] font-bold shadow-md ring-1 ring-[#dfb76c]'
                          : 'bg-[#180a04] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400">👑</span>
                        <span>{ownerDisplayName}</span>
                      </div>
                      <span className="text-[10px] text-[#dfb76c]/80 block truncate mt-0.5 font-mono">
                        {primaryOwnerEmail}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPasswordTarget('self')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        selectedPasswordTarget === 'self'
                          ? 'bg-[#3b1c0b] border-[#dfb76c] text-[#f5e29f] font-bold shadow-md ring-1 ring-[#dfb76c]'
                          : 'bg-[#180a04] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">👤</span>
                        <span>{isCoOwner ? 'My Co-Owner Account' : 'The Chai Den Co-Owner'}</span>
                      </div>
                      <span className="text-[10px] text-[#dfb76c]/80 block truncate mt-0.5 font-mono">
                        {isCoOwner ? currentUser.email : (usersList.find((u) => u.role === 'CO_OWNER')?.email || 'coowner@chaiden.com')}
                      </span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#eedfca]/80 italic">
                    {isCoOwner
                      ? '👑 Equal Access: As Co-Owner, you have full permission to update the Owner password directly or change your own password.'
                      : 'You have full permission to update your password or update the Co-Owner password.'}
                  </p>
                </div>
              )}

              <form onSubmit={handleOwnerChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-outfit text-[#dfb76c] uppercase mb-1">
                    {selectedPasswordTarget === 'owner'
                      ? `New Password for Owner (${primaryOwnerEmail})`
                      : isCoOwner
                      ? `New Password for My Account (${currentUser.email})`
                      : `New Password for Co-Owner (${usersList.find((u) => u.role === 'CO_OWNER')?.email || 'coowner@chaiden.com'})`}
                  </label>
                  <div className="relative">
                    <input
                      type={showOwnerNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter minimum 6 characters"
                      value={ownerNewPassword}
                      onChange={(e) => setOwnerNewPassword(e.target.value)}
                      className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 pr-10 py-2 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerNewPassword(!showOwnerNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dfb76c]/60 hover:text-[#dfb76c]"
                    >
                      {showOwnerNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-wider font-outfit hover:brightness-110 shadow-lg transition-all"
                >
                  {selectedPasswordTarget === 'owner'
                    ? 'Update Owner Password'
                    : isCoOwner
                    ? 'Update My Password'
                    : 'Update Co-Owner Password'}
                </button>
              </form>
            </div>

            {/* Co-Owner Privileges Card */}
            {isCoOwner && (
              <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-base">👑</span>
                  <h3 className="font-cinzel text-base font-bold text-[#fff4db]">
                    Co-Owner Privileges & Equal Authority
                  </h3>
                </div>
                <p className="text-xs text-[#eedfca] leading-relaxed">
                  As Co-Owner, you have <strong>equal administrative authority</strong> alongside the Owner. You can update the Owner password directly, change your own password, manage user accounts, modify menu items, and update prices in real time.
                </p>
              </div>
            )}

            {/* Owner Registered Gmail Address Management */}
            <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#dfb76c]" />
                    <h3 className="font-cinzel text-base font-bold text-[#fff4db]">
                      Primary Owner ID & Registered Gmail
                    </h3>
                  </div>
                  <p className="text-xs text-[#dfb76c]/70 mt-0.5">
                    Security ID required by all users (Owner, Co-Owner, Manager, Staff) to sign into the system
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#381a0b] text-amber-300 border border-[#dfb76c]/40">
                  Primary Owner ID
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-xs">
                  <span className="text-[#dfb76c]/70 block text-[10px] uppercase font-outfit">
                    Active Primary Owner ID (Required in Login)
                  </span>
                  <span className="font-mono text-[#f5efe6] font-semibold text-sm">
                    {settings.primaryOwnerId || settings.primaryOwnerEmail || 'cherry1011705897@gmail.com'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-xs">
                  <span className="text-[#dfb76c]/70 block text-[10px] uppercase font-outfit">
                    Current Registered Owner Gmail
                  </span>
                  <span className="font-mono text-[#f5efe6] font-semibold text-sm">
                    {settings.primaryOwnerEmail || 'cherry1011705897@gmail.com'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleUpdateOwnerGmail} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-outfit text-[#dfb76c] uppercase mb-1">
                    Enter New Primary Owner ID or Gmail Address
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. newowner@gmail.com or OWNER-CHAI-01"
                      value={ownerGmailInput}
                      onChange={(e) => setOwnerGmailInput(e.target.value)}
                      className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#f5efe6] placeholder-[#dfb76c]/40 focus:outline-none focus:border-[#dfb76c]"
                    />
                  </div>
                  <p className="text-[11px] text-[#dfb76c]/60 mt-1">
                    When you update this ID, all roles (Owner, Co-Owner, Manager, Staff) will only be able to log in using this new Primary Owner ID.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={ownerGmailUpdating}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-wider font-outfit hover:brightness-110 shadow-lg disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{ownerGmailUpdating ? 'Updating...' : 'Save New Primary Owner ID'}</span>
                </button>
              </form>
            </div>

            {/* Backup Email Section (Owner Only) */}
            {isOwner && (
              <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-cinzel text-base font-bold text-[#fff4db]">
                    Emergency Backup Recovery Email
                  </h3>
                  <p className="text-xs text-[#dfb76c]/70 mt-0.5">
                    Used to recover access in case primary credentials are lost
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    settings.backupEmailVerified
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                  }`}
                >
                  {settings.backupEmailVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-xs">
                <span className="text-[#dfb76c]/70 block text-[10px] uppercase">
                  Current Backup Email
                </span>
                <span className="font-mono text-[#f5efe6] font-semibold text-sm">
                  {settings.backupEmail || 'Not configured'}
                </span>
              </div>

              {otpStep ? (
                <form onSubmit={handleVerifyBackupOtp} className="space-y-3 pt-2">
                  {simulatedOtpNotice && (
                    <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-200">
                      <strong>Verification Notice:</strong> {simulatedOtpNotice}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-outfit text-[#dfb76c] uppercase mb-1">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 482931"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-sm text-[#f5efe6] font-mono tracking-widest text-center focus:outline-none focus:border-[#dfb76c]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-[#dfb76c] text-[#1c0e07] font-bold text-xs uppercase tracking-wider font-outfit hover:bg-[#edd085]"
                    >
                      Confirm Backup Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpStep(false)}
                      className="px-4 py-2 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-xs text-[#dfb76c]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRequestBackupOtp} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-outfit text-[#dfb76c] uppercase mb-1">
                      Update Backup Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="backup@chaiden.com"
                      value={backupEmailInput}
                      onChange={(e) => setBackupEmailInput(e.target.value)}
                      className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl bg-[#dfb76c] text-[#1c0e07] font-bold text-xs uppercase tracking-wider font-outfit hover:bg-[#edd085]"
                  >
                    Request 6-Digit Verification Code
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
        )}

        {/* TAB 7: ACTIVITY LOG */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfb76c]/30 pb-4">
              <div>
                <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
                  System Activity & Audit Log
                </h2>
                <p className="text-xs text-[#dfb76c]/80 font-outfit mt-1">
                  Chronological record of price changes, product additions, role updates, and logins ({activityLogs.length} total entries)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportLogs}
                  disabled={activityLogs.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-900 border border-emerald-500/50 text-white font-bold text-xs font-outfit hover:brightness-110 flex items-center gap-1.5 shadow disabled:opacity-50 transition cursor-pointer"
                  title="Export Activity Log to Excel sheet (.csv)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>Export to Excel</span>
                </button>

                <button
                  onClick={handleClearLogs}
                  disabled={activityLogs.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 font-bold text-xs font-outfit hover:bg-red-900/60 flex items-center gap-1.5 shadow disabled:opacity-50 transition cursor-pointer"
                  title="Clear all activity logs"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Clear Log</span>
                </button>
              </div>
            </div>

            <div className="bg-[#160a04] border border-[#dfb76c]/40 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-outfit">
                  <thead>
                    <tr className="bg-[#200f07] border-b border-[#dfb76c]/30 text-[11px] uppercase tracking-wider text-[#dfb76c]">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Affected Item / Target</th>
                      <th className="py-3 px-4">Authorized User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dfb76c]/20">
                    {activityLogs.map((log) => (
                      <tr key={log.logId} className="hover:bg-[#200f07]/50">
                        <td className="py-3 px-4 font-mono text-[11px] text-[#dfb76c]/80">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#f5efe6]">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-[#eedfca]">
                          {log.target}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-[#dfb76c]/80 font-mono">
                          {log.userEmail}
                        </td>
                      </tr>
                    ))}

                    {activityLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-[#dfb76c]/70 font-outfit">
                          <p>No activity logs recorded yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD / EDIT MENU ITEM */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#160a04] border-2 border-[#dfb76c] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setItemModalOpen(false)}
              className="absolute top-4 right-4 text-[#dfb76c]/60 hover:text-[#dfb76c]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-cinzel text-xl font-bold text-gold-gradient mb-4">
              {editingItem ? 'Edit Menu Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs font-outfit">
              <div>
                <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemFormData.name}
                  onChange={(e) =>
                    setItemFormData({ ...itemFormData, name: e.target.value })
                  }
                  placeholder="e.g. 1. Premium Dum Tea"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={itemFormData.categoryId}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, categoryId: e.target.value })
                    }
                    className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={itemFormData.price}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, price: Number(e.target.value) })
                    }
                    className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) =>
                    setItemFormData({ ...itemFormData, description: e.target.value })
                  }
                  placeholder="Ingredients, brewing style, notes..."
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-[#200f07] p-2.5 rounded-xl border border-[#dfb76c]/30">
                  <input
                    type="checkbox"
                    checked={itemFormData.isNew}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, isNew: e.target.checked })
                    }
                    className="accent-[#dfb76c]"
                  />
                  <span className="text-[#f5efe6]">Mark with &apos;NEW&apos; badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#200f07] p-2.5 rounded-xl border border-[#dfb76c]/30">
                  <input
                    type="checkbox"
                    checked={itemFormData.active}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, active: e.target.checked })
                    }
                    className="accent-[#dfb76c]"
                  />
                  <span className="text-[#f5efe6]">Visible on Menu</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#dfb76c]/30">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-[#dfb76c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#dfb76c] to-[#b8860b] text-[#1c0e07] font-bold uppercase tracking-wider"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#160a04] border-2 border-[#dfb76c] rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setCatModalOpen(false)}
              className="absolute top-4 right-4 text-[#dfb76c]/60 hover:text-[#dfb76c]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-cinzel text-xl font-bold text-gold-gradient mb-4">
              {editingCat ? 'Edit Category' : 'Add New Category'}
            </h3>

            <form onSubmit={handleSaveCat} className="space-y-4 text-xs font-outfit">
              <div>
                <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catFormData.name}
                  onChange={(e) =>
                    setCatFormData({ ...catFormData, name: e.target.value })
                  }
                  placeholder="e.g. MILK SHAKES"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                    Ribbon Color *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catFormData.color}
                      onChange={(e) =>
                        setCatFormData({ ...catFormData, color: e.target.value })
                      }
                      className="w-10 h-9 bg-transparent border border-[#dfb76c]/40 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={catFormData.color}
                      onChange={(e) =>
                        setCatFormData({ ...catFormData, color: e.target.value })
                      }
                      className="flex-1 bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-2.5 py-2 text-[#f5efe6] font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={catFormData.displayOrder}
                    onChange={(e) =>
                      setCatFormData({
                        ...catFormData,
                        displayOrder: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#dfb76c]/30">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-[#dfb76c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#dfb76c] to-[#b8860b] text-[#1c0e07] font-bold uppercase tracking-wider"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER ACCOUNT (OWNER ONLY) */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#160a04] border-2 border-[#dfb76c] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setUserModalOpen(false)}
              className="absolute top-4 right-4 text-[#dfb76c]/60 hover:text-[#dfb76c]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-cinzel text-xl font-bold text-gold-gradient mb-4">
              {editingUser
                ? `Edit Account: ${editingUser.name}`
                : 'Create User Account (Owner / Co-Owner / Manager / Staff)'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs font-outfit">
              <div>
                <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, name: e.target.value })
                  }
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
              </div>

              <div>
                <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                  Account Email / Gmail *
                </label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, email: e.target.value })
                  }
                  placeholder="e.g. owner@gmail.com"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
                {(editingUser?.role === 'OWNER' || userFormData.role === 'OWNER') && (
                  <span className="text-[10px] text-amber-400 block mt-1 font-outfit">
                    👑 Owner Gmail: Used for OTP login codes, system verification, and ownership
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[#dfb76c] uppercase tracking-wider mb-1">
                  Assign Role *
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setUserFormData({
                      ...userFormData,
                      role: r,
                      permissions: { ...DEFAULT_PERMISSIONS[r] },
                    });
                  }}
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                >
                  <option value="OWNER">OWNER (Full Administrative Access & Ownership)</option>
                  <option value="CO_OWNER">CO_OWNER (Menu & Category Manager)</option>
                  <option value="MANAGER">MANAGER (Menu items & price editor)</option>
                  <option value="STAFF">STAFF (View only)</option>
                </select>
              </div>

              {/* Password Field (Owner & Co-Owner can change password for user) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#dfb76c] uppercase tracking-wider">
                    {editingUser
                      ? (editingUser.role === 'OWNER' || editingUser.email.toLowerCase() === primaryOwnerEmail.toLowerCase())
                        ? 'Update Owner Password'
                        : 'Change User Password (Optional)'
                      : 'Initial Password *'}
                  </label>
                  {isCoOwner && editingUser && (editingUser.role === 'OWNER' || editingUser.email.toLowerCase() === primaryOwnerEmail.toLowerCase()) && (
                    <span className="text-[10px] text-amber-300 font-bold bg-[#381a0b] px-2 py-0.5 rounded border border-[#dfb76c]/30">
                      👑 Co-Owner Equal Access
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    required={!editingUser}
                    placeholder={
                      editingUser
                        ? (editingUser.role === 'OWNER' || editingUser.email.toLowerCase() === primaryOwnerEmail.toLowerCase())
                          ? 'Enter new Owner password (min 6 chars)'
                          : 'Leave blank to keep existing password'
                        : 'Enter account password'
                    }
                    value={userFormData.password}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, password: e.target.value })
                    }
                    className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl px-3.5 pr-10 py-2 text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dfb76c]/60 hover:text-[#dfb76c]"
                  >
                    {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Permissions Checkboxes */}
              <div className="pt-2 border-t border-[#dfb76c]/20">
                <span className="text-[11px] uppercase tracking-wider text-[#dfb76c] block mb-2 font-bold">
                  Custom Permissions:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions.canEditPrices}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canEditPrices: e.target.checked,
                          },
                        })
                      }
                      className="accent-[#dfb76c]"
                    />
                    <span>Edit Prices</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions.canAddItems}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canAddItems: e.target.checked,
                          },
                        })
                      }
                      className="accent-[#dfb76c]"
                    />
                    <span>Add Products</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions.canEditItems}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canEditItems: e.target.checked,
                          },
                        })
                      }
                      className="accent-[#dfb76c]"
                    />
                    <span>Edit Products</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.permissions.canManageCategories}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canManageCategories: e.target.checked,
                          },
                        })
                      }
                      className="accent-[#dfb76c]"
                    />
                    <span>Manage Categories</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#dfb76c]/30">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-[#dfb76c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#dfb76c] to-[#b8860b] text-[#1c0e07] font-bold uppercase tracking-wider"
                >
                  {editingUser ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL (Safe in-app modal, avoids window.confirm sandbox issues) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#160a04] border-2 border-[#dfb76c] rounded-2xl p-6 shadow-2xl relative text-xs font-outfit">
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`p-2.5 rounded-xl ${
                  confirmModal.isDestructive
                    ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                    : 'bg-[#200f07] text-[#dfb76c] border border-[#dfb76c]/40'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-cinzel text-base font-bold text-gold-gradient">
                  {confirmModal.title}
                </h3>
                <p className="text-[#ded0c0] mt-1.5 leading-relaxed text-xs">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#dfb76c]/30">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 rounded-xl bg-[#200f07] border border-[#dfb76c]/40 text-[#dfb76c] hover:bg-[#2c150b] transition font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmModal.onConfirm;
                  setConfirmModal({ ...confirmModal, isOpen: false });
                  await fn();
                }}
                className={`px-5 py-2 rounded-xl font-bold uppercase tracking-wider text-xs transition ${
                  confirmModal.isDestructive
                    ? 'bg-red-700 hover:bg-red-600 text-white shadow-lg'
                    : 'bg-gradient-to-r from-[#dfb76c] to-[#b8860b] text-[#1c0e07] hover:brightness-110 shadow-lg'
                }`}
              >
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
