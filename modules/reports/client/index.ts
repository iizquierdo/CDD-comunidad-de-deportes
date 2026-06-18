import React from 'react';
import { ModuleClientDefinition } from '@sinapsis/module-sdk-client';
import ReportsModule from './ReportsModule';
import { REPORTS_TRANSLATIONS } from './translations';

const moduleDefinition: ModuleClientDefinition = {
  code: 'REPORTS',
  mainNav: {
    id: 'reports',
    icon: 'fa-file-lines'
  },
  views: {
    Reports: ({ setView, currentUser, companyId, onSubTitleChange }) =>
      React.createElement(ReportsModule, { view: 'list', setView, currentUser, companyId, onSubTitleChange }),
  },
  routes: [
    { view: 'Reports', path: 'reports' }
  ],
  sidebarSections: [
    {
      label: 'reports.title',
      items: [{ name: 'reports.list', view: 'Reports', icon: 'fa-file-lines' }]
    }
  ],
  breadcrumbs: {
    Reports: { main: 'reports.title', sub: 'reports.list' }
  },
  translations: REPORTS_TRANSLATIONS
};

export default moduleDefinition;
