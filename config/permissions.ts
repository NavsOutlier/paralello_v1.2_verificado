/**
 * Permission Configurations
 * 
 * Central configuration for user permissions by role.
 */
export const PERMISSIONS = {
    MANAGER: {
        canManageClients: true,
        canManageTasks: true,
        canManageTeam: true
    },
    MEMBER: {
        canManageClients: false,
        canManageTasks: true,
        canManageTeam: false
    },
    VIEWER: {
        canManageClients: false,
        canManageTasks: false,
        canManageTeam: false
    }
} as const;

/**
 * Get permissions for a role
 */
export function getPermissions(role: 'manager' | 'member' | 'viewer') {
    const roleKey = role.toUpperCase() as keyof typeof PERMISSIONS;
    return PERMISSIONS[roleKey] || PERMISSIONS.VIEWER;
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: 'manager' | 'member' | 'viewer', permission: keyof typeof PERMISSIONS.MANAGER): boolean {
    const permissions = getPermissions(role);
    return permissions[permission] || false;
}
