import React from 'react';
import { ModuleClientDefinition } from '@sinapsis/module-sdk-client';
import AssetsModule from './AssetsModule';
import { ASSETS_TRANSLATIONS } from './translations';

const moduleDefinition: ModuleClientDefinition = {
  code: 'ASSETS',
  mainNav: {
    id: 'assets',
    icon: 'fa-boxes-stacked'
  },
  views: {
    Assets: ({ setView, currentUser, companyId, onSubTitleChange }) =>
      React.createElement(AssetsModule, { view: 'list', setView, currentUser, companyId, onSubTitleChange }),
    AssetDetails: ({ setView, currentUser, companyId, onSubTitleChange, recordId }) =>
      React.createElement(AssetsModule, { view: 'details', setView, currentUser, companyId, onSubTitleChange, recordId })
  },
  routes: [
    { view: 'Assets', path: 'assets' },
    { view: 'AssetDetails', path: 'assets/:id' }
  ],
  sidebarSections: [
    {
      label: 'assets.title',
      items: [{ name: 'assets.list', view: 'Assets', icon: 'fa-boxes-stacked' }]
    }
  ],
  breadcrumbs: {
    Assets: { main: 'assets.title', sub: 'assets.list' },
    AssetDetails: { main: 'assets.title', sub: 'assets.details', listTarget: 'Assets' }
  },
  translations: ASSETS_TRANSLATIONS
};

export default moduleDefinition;
