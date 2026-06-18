import React from 'react';
import { ModuleClientDefinition } from '@sinapsis/module-sdk-client';
import MensajeriaModule from './MensajeriaModule';
import { MESSAGING_TRANSLATIONS } from './translations';

const moduleDefinition: ModuleClientDefinition = {
  code: 'MESSAGING',
  mainNav: {
    id: 'messaging',
    icon: 'fa-comments'
  },
  views: {
    Messaging: ({ setView, currentUser, companyId, onSubTitleChange }) =>
      React.createElement(MensajeriaModule, { view: 'list', setView, currentUser, companyId, onSubTitleChange }),
    MessagingThread: ({ setView, currentUser, companyId, onSubTitleChange, recordId }) =>
      React.createElement(MensajeriaModule, { view: 'thread', setView, currentUser, companyId, onSubTitleChange, threadId: recordId })
  },
  routes: [
    { view: 'Messaging', path: 'messaging' },
    { view: 'MessagingThread', path: 'messaging/:id' }
  ],
  sidebarSections: [
    {
      label: 'messaging.title',
      items: [{ name: 'messaging.list', view: 'Messaging', icon: 'fa-comments' }]
    }
  ],
  breadcrumbs: {
    Messaging: { main: 'messaging.title', sub: 'messaging.list' },
    MessagingThread: { main: 'messaging.title', sub: 'messaging.list', listTarget: 'Messaging' }
  },
  translations: MESSAGING_TRANSLATIONS
};

export default moduleDefinition;
