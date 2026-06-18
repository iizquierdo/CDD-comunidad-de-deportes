import { matchPath, generatePath } from 'react-router-dom';
import type { ViewType } from '@/types';
import type { ModuleClientDefinition } from '@sinapsis/module-sdk-client';

/**
 * Tenant URL routing registry.
 *
 * The tenant shell historically navigated through a `currentView` state machine.
 * This registry maps every `ViewType` to a real URL path so the app can expose
 * shareable, reloadable routes (e.g. `/students`, `/students/:id`) while the
 * navigation surfaces (sidebar, header, breadcrumb, footer) keep using the same
 * `currentView` / `setView(view)` contract — now backed by the router.
 *
 * Paths are absolute (leading `/`). Detail routes use a `:id` segment that is
 * mirrored back to the module through `ModuleRenderContext.recordId`.
 */

/** Built-in (non-module) views shipped by the web app. */
export const STATIC_VIEW_PATHS: Record<string, string> = {
  Dashboard: '/',
  Projects: '/projects',
  Social: '/social',
  Profile: '/profile',
  Tickets: '/tickets',
  Users: '/users',
  Roles: '/roles',
  Subscriptions: '/subscriptions',
  FileManager: '/files',
  Inbox: '/inbox',
  Chat: '/chat',
  Calendar: '/calendar',
  FAQ: '/faq',
  Invoices: '/invoices',
  CreateInvoice: '/invoices/create',
  InvoiceDetail: '/invoices/detail',
  OrganizationSettings: '/settings/organization',
  MyPlanSettings: '/settings/plan',
  CompanySettings: '/settings/companies',
  SMTPSettings: '/settings/smtp',
  LanguageSettings: '/settings/languages',
  BackupSettings: '/settings/backup',
  PaymentSettings: '/settings/payments',
  UserSettings: '/settings/users',
  RoleSettings: '/settings/roles',
  ModuleSettings: '/settings/modules',
  CategorySettings: '/settings/categories',
  ReferenceSettings: '/settings/references',
  StorageSettings: '/settings/storage',
  MenuSettings: '/settings/menus',
  AppBrandingSettings: '/settings/app-branding'
};

export interface ViewRoute {
  view: ViewType;
  /** Absolute path pattern (leading `/`), e.g. `/students` or `/students/:id`. */
  path: string;
}

const normalizePath = (path: string): string => {
  const trimmed = String(path || '').trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const paramCount = (path: string): number => (path.match(/:/g) || []).length;

/**
 * Builds the full view↔path registry from the static views plus every active
 * module's declared `routes`. Sorted so literal paths win over `:param` ones.
 */
export const buildViewRoutes = (modules: ModuleClientDefinition[]): ViewRoute[] => {
  const routes: ViewRoute[] = Object.entries(STATIC_VIEW_PATHS).map(([view, path]) => ({ view, path }));

  for (const module of modules) {
    for (const route of module.routes || []) {
      if (!route?.view || !route?.path) continue;
      routes.push({ view: route.view, path: normalizePath(route.path) });
    }
  }

  // Most-specific first: fewer params, then longer paths. Avoids `/x/:id`
  // shadowing a literal `/x/new` when both could match a pathname.
  return routes.sort((a, b) => {
    const params = paramCount(a.path) - paramCount(b.path);
    if (params !== 0) return params;
    return b.path.length - a.path.length;
  });
};

export interface MatchedView {
  view: ViewType;
  params: Record<string, string | undefined>;
}

/** Resolves the active view (and any URL params, e.g. `id`) for a pathname. */
export const viewForPath = (routes: ViewRoute[], pathname: string): MatchedView | null => {
  for (const route of routes) {
    const match = matchPath({ path: route.path, end: true }, pathname);
    if (match) {
      return { view: route.view, params: match.params as Record<string, string | undefined> };
    }
  }
  return null;
};

/** Builds the absolute URL for a view, substituting `:param` segments. */
export const pathForView = (
  routes: ViewRoute[],
  view: ViewType,
  params?: Record<string, string>
): string | null => {
  const route = routes.find((entry) => entry.view === view);
  if (!route) return null;
  try {
    return generatePath(route.path, params);
  } catch {
    // Missing required params (e.g. a detail view navigated without an id):
    // fall back to the raw pattern so navigation degrades instead of throwing.
    return route.path;
  }
};
