import React from 'react';
import { ModuleClientDefinition } from '@sinapsis/module-sdk-client';
import TeachersModule from './TeachersModule';
import { TEACHERS_TRANSLATIONS } from './translations';

const moduleDefinition: ModuleClientDefinition = {
  code: 'TEACHERS',
  mainNav: {
    id: 'teachers',
    icon: 'fa-chalkboard-user'
  },
  views: {
    Teachers: ({ setView, currentUser, companyId, onSubTitleChange }) =>
      React.createElement(TeachersModule, { view: 'list', setView, currentUser, companyId, onSubTitleChange })
  },
  routes: [
    { view: 'Teachers', path: 'teachers' }
  ],
  sidebarSections: [
    {
      label: 'teachers.title',
      items: [{ name: 'teachers.list', view: 'Teachers', icon: 'fa-chalkboard-user' }]
    }
  ],
  breadcrumbs: {
    Teachers: { main: 'teachers.title', sub: 'teachers.list' }
  },
  translations: TEACHERS_TRANSLATIONS
};

export default moduleDefinition;
