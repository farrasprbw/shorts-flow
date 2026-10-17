import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'review',
        pathMatch: 'full'
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./features/review/review-queue/review-queue.component').then(
            m => m.ReviewQueueComponent
          )
      },
      {
        path: 'review/:id',
        loadComponent: () =>
          import('./features/review/review-detail/review-detail.component').then(
            m => m.ReviewDetailComponent
          )
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/schedule/schedule-list/schedule-list.component').then(
            m => m.ScheduleListComponent
          )
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics-dashboard/analytics-dashboard.component').then(
            m => m.AnalyticsDashboardComponent
          )
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin-users/admin-users.component').then(
            m => m.AdminUsersComponent
          )
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'review'
  }
];
