import type { JSX } from 'react';
import type { AppUser, ViewType } from '@sinapsis/shared-types';

export interface ModuleRenderContext {
  setView: (view: ViewType, params?: Record<string, string>) => void;
  currentUser?: AppUser;
  companyId?: string;
  onSubTitleChange?: (subtitle: string) => void;
  /** Route param (e.g. the selected record id) parsed from the URL for detail views. */
  recordId?: string;
}

export interface ModuleMenuItem {
  name: string;
  view: ViewType;
  icon: string;
}

export interface ModuleMenuSection {
  label: string;
  items: ModuleMenuItem[];
}

export interface ModuleBreadcrumb {
  main: string;
  sub: string;
  listTarget?: ViewType;
}

/**
 * Maps a module view to a URL path so the tenant app can expose real routes
 * (e.g. `/students` for the list and `/students/:id` for the detail).
 * `path` is relative to the app base (no leading slash); use `:param` segments
 * for record ids, mirrored back to the view through `ModuleRenderContext.recordId`.
 */
export interface ModuleRoute {
  view: ViewType;
  path: string;
}

export interface ModuleClientDefinition {
  code: string;
  mainNav: {
    id: string;
    icon: string;
  };
  views: Partial<Record<ViewType, (ctx: ModuleRenderContext) => JSX.Element>>;
  /** URL routes for the module's views. Views without an entry have no URL of their own. */
  routes?: ModuleRoute[];
  sidebarSections: ModuleMenuSection[];
  breadcrumbs?: Partial<Record<ViewType, ModuleBreadcrumb>>;
  translations?: Partial<Record<string, Record<string, unknown>>>;
}
