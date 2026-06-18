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
      React.createElement(TeachersModule, { view: 'list', setView, currentUser, companyId, onSubTitleChange }),
    TeacherDetails: ({ setView, currentUser, companyId, onSubTitleChange, recordId }) =>
      React.createElement(TeachersModule, { view: 'details', setView, currentUser, companyId, onSubTitleChange, recordId })
  },
  routes: [
    { view: 'Teachers', path: 'teachers' },
    { view: 'TeacherDetails', path: 'teachers/:id' }
  ],
  sidebarSections: [
    {
      label: 'teachers.title',
      items: [{ name: 'teachers.list', view: 'Teachers', icon: 'fa-chalkboard-user' }]
    }
  ],
  breadcrumbs: {
    Teachers: { main: 'teachers.title', sub: 'teachers.list' },
    TeacherDetails: { main: 'teachers.title', sub: 'teachers.details', listTarget: 'Teachers' }
  },
  translations: TEACHERS_TRANSLATIONS
};

export default moduleDefinition;
