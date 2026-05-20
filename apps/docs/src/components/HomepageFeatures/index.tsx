import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Tracks in the background',
    emoji: '📍',
    description: (
      <>
        Keep recording location in the foreground, background, and after the app
        is killed. Three providers — distance-filter, activity-based, and raw —
        let you trade fidelity for battery.
      </>
    ),
  },
  {
    title: 'Powered by Nitro Modules',
    emoji: '⚡',
    description: (
      <>
        Built on the JSI bridge from{' '}
        <a
          href="https://nitro.margelo.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Nitro Modules
        </a>
        . React Native's new architecture, typed enums, and Promise-based I/O —
        no legacy bridge, no untyped event names.
      </>
    ),
  },
  {
    title: 'Sync without writing JS',
    emoji: '🔄',
    description: (
      <>
        Configure a server URL and the native side batches, retries, and POSTs
        recorded locations. A typed{' '}
        <a href="/react-native-nitro-background-geolocation/docs/headless-tasks">
          headless handler
        </a>{' '}
        is available on Android when you need killed-state JS too.
      </>
    ),
  },
];

function Feature({ title, emoji, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureEmoji} role="img" aria-label={title}>
          {emoji}
        </div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
