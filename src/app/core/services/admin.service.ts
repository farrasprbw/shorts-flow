import { Injectable, signal, inject } from '@angular/core';
import { Role, RoleName, User } from '../models/auth.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiService = inject(ApiService);

  constructor() {
    this.loadFromApi();
  }

  async loadFromApi() {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        this.apiService.getAdminUsers(),
        this.apiService.getAdminRoles()
      ]);

      if (usersRes?.success && Array.isArray(usersRes.data)) {
        this._users.set(usersRes.data);
      }
      if (rolesRes?.success && Array.isArray(rolesRes.data)) {
        this._roles.set(rolesRes.data);
      }
    } catch (err) {
      console.warn('[AdminService] Cannot load admin data from API:', err);
    }
  }

  private readonly _users = signal<User[]>([]);
  private readonly _roles = signal<Role[]>([]);

  public readonly users = this._users.asReadonly();
  public readonly roles = this._roles.asReadonly();

  async saveUser(user: Partial<User> & { id?: string }) {
    try {
      await this.apiService.saveAdminUser(user);
      await this.loadFromApi();
    } catch (err) {
      console.warn('[AdminService] Error saving user to API:', err);
    }
  }

  async toggleUserStatus(id: string) {
    this._users.update(items =>
      items.map(u => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );

    try {
      await this.apiService.toggleUserStatus(id);
      await this.loadFromApi();
    } catch (err) {
      console.warn('[AdminService] Error toggling user status in API:', err);
    }
  }

  async saveRole(role: { id?: string; name?: string; label?: string; level?: number; canFinalApprove?: boolean; isActive?: boolean }) {
    if (role.id) {
      // Update
      this._roles.update(items =>
        items.map(r => (r.id === role.id ? { ...r, ...role } as Role : r))
      );
    } else {
      // Create
      const newRole: Role = {
        id: 'role-' + Math.random().toString(36).substring(2, 8),
        name: (role.name || 'reviewer_custom') as RoleName,
        label: role.label || 'Role Kustom',
        level: role.level ?? 3,
        canFinalApprove: role.canFinalApprove ?? false,
        isActive: role.isActive ?? true
      };
      this._roles.update(items => [...items, newRole]);
    }

    try {
      await this.apiService.saveAdminRole(role);
      await this.loadFromApi();
    } catch (err) {
      console.warn('[AdminService] Error saving role to API, kept optimistic state:', err);
    }
  }

  async toggleRoleStatus(id: string) {
    this._roles.update(items =>
      items.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  }
}
