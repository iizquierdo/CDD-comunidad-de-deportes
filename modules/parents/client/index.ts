import React from 'react';
import { ModuleClientDefinition } from '@sinapsis/module-sdk-client';
import ParentsModule from './ParentsModule';
import { PARENTS_TRANSLATIONS } from './translations';

const moduleDefinition: ModuleClientDefinition = {
  code: 'PARENTS',
  mainNav: {
    id: 'parents',
    icon: 'fa-people-roof'
  },
  views: {
    Parents: ({ setView, currentUser, companyId, onSubTitleChange }) =>
      React.createElement(ParentsModule, { view: 'list', setView, currentUser, companyId, onSubTitleChange })
  },
  routes: [
    { view: 'Parents', path: 'parents' }
  ],
  sidebarSections: [
    {
      label: 'parents.title',
      items: [{ name: 'parents.list', view: 'Parents', icon: 'fa-people-roof' }]
    }
  ],
  breadcrumbs: {
    Parents: { main: 'parents.title', sub: 'parents.list' }
  },
  translations: PARENTS_TRANSLATIONS
};

export default moduleDefinition;
