export type UserRole = 'OWNER' | 'CO_OWNER' | 'MANAGER' | 'STAFF';

export interface RolePermissions {
  canEditPrices: boolean;
  canAddItems: boolean;
  canEditItems: boolean;
  canDeleteItems: boolean;
  canManageCategories: boolean;
  canManageUsers: boolean;
  canManageSecurity: boolean;
  canViewLogs: boolean;
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: RolePermissions;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  password?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  image?: string;
  displayOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  description?: string;
  image?: string;
  isNew?: boolean;
  isVeg?: boolean;
  active: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CafeSettings {
  id?: string;
  restaurantName: string;
  primaryOwnerEmail: string;
  primaryOwnerId?: string;
  backupEmail: string;
  backupEmailVerified: boolean;
  publicMenuUrl: string;
  tagline?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  logId: string;
  userId: string;
  userEmail: string;
  action: string;
  target: string;
  timestamp: string;
}
