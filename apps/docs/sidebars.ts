import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    'intro',
    'getting-started',
    'configuration',
    {
      type: 'category',
      label: 'Location Providers',
      items: [
        'providers/distance-filter',
        'providers/activity',
        'providers/raw',
      ],
    },
    'events',
    'http-posting',
    'headless-tasks',
    'platform-quirks',
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/decisions'],
    },
  ],
};

export default sidebars;
