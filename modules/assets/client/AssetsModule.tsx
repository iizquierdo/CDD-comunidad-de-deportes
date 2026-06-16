import React from 'react';
import { ViewType } from '@sinapsis/shared-types';
import { AppUser } from '@sinapsis/shared-types';

type AssetsView = 'list' | 'details';

interface AssetsModuleProps {
  view: AssetsView;
  setView: (view: ViewType, params?: Record<string, string>) => void;
  currentUser?: AppUser;
  companyId?: string;
  onSubTitleChange?: (subtitle: string) => void;
  recordId?: string;
}

const AssetsModule: React.FC<AssetsModuleProps> = () => {
  return (
    <div className="p-6">
      <p className="text-muted-foreground">Módulo de recursos próximamente.</p>
    </div>
  );
};

export default AssetsModule;
