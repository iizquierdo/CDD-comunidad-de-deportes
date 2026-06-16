import React from 'react';
import { ModuleClientDefinition } from '@sinapsis/module-sdk-client';
import ClassModule from './ClassModule';
import { CLASSES_TRANSLATIONS } from './translations';

const moduleDefinition: ModuleClientDefinition = {
  code: 'CLASSES',
  mainNav: {
    id: 'classes',
    icon: 'fa-calendar-days'
  },
  views: {
    Classes: ({ setView, currentUser, companyId, onSubTitleChange }) =>
      React.createElement(ClassModule, { view: 'list', setView, currentUser, companyId, onSubTitleChange }),
    ClassDetails: ({ setView, currentUser, companyId, onSubTitleChange, recordId }) =>
      React.createElement(ClassModule, { view: 'details', setView, currentUser, companyId, onSubTitleChange, recordId })
  },
  routes: [
    { view: 'Classes', path: 'classes' },
    { view: 'ClassDetails', path: 'classes/:id' }
  ],
  sidebarSections: [
    {
      label: 'classes.title',
      items: [{ name: 'classes.list', view: 'Classes', icon: 'fa-calendar-days' }]
    }
  ],
  breadcrumbs: {
    Classes: { main: 'classes.title', sub: 'classes.list' },
    ClassDetails: { main: 'classes.title', sub: 'classes.details', listTarget: 'Classes' }
  },
  translations: CLASSES_TRANSLATIONS
};

export default moduleDefinition;
