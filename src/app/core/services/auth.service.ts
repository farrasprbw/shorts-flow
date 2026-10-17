import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RoleName, User } from '../models/auth.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _users = signal<User[]>([]);
  public readonly users = this._users.asReadonly();


  // Current logged in user (starts null, populated upon API login)
  private readonly _currentUser = signal<User | null>(null);
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => this._currentUser() !== null);

  private apiService = inject(ApiService);

  constructor(private router: Router) {
    this.initAuth();
  }

  async initAuth() {
    await this.loadUsersFromApi();
    // Default login with primary admin account via API
    await this.login('farras@shortsflow.ai', 'password123');
  }

  async loadUsersFromApi() {
    try {
      const res = await this.apiService.getAdminUsers();
      if (res?.success && Array.isArray(res.data)) {
        this._users.set(res.data);
      }
    } catch (err) {
      console.warn('[AuthService] Cannot load users from API:', err);
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const res = await this.apiService.login(email, password);
      if (res && res.token && res.user) {
        localStorage.setItem('sf_token', res.token);
        const loggedUser: User = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          roles: res.user.roles,
          isActive: true,
          avatarUrl: res.user.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          createdAt: new Date().toISOString()
        };
        this._currentUser.set(loggedUser);
        return true;
      }
    } catch (err) {
      console.warn('[AuthService] API login failed:', err);
    }
    return false;
  }

  logout() {
    localStorage.removeItem('sf_token');
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // Helper to switch active user on the fly for approval testing
  async switchUser(userIdOrEmail: string) {
    const user = this._users().find(
      u => u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );
    if (user) {
      await this.login(user.email, 'password123');
    }
  }

  hasRole(role: RoleName): boolean {
    const user = this._currentUser();
    if (!user) return false;
    return user.roles.includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  canApproveAtLevel(level: number): boolean {
    const user = this._currentUser();
    if (!user) return false;

    // Strict level tier separation: each reviewer only reviews their assigned tier
    if (level === 1) {
      return user.roles.includes('reviewer_level_1');
    }

    if (level === 2) {
      return user.roles.includes('reviewer_level_2');
    }

    return false;
  }
}
