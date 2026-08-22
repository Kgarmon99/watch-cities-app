'use client';

import dynamic from 'next/dynamic';

const DynamicMapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
});

const DynamicMapLoader: React.FC = () => {
  return <DynamicMapComponent />;
};

export default DynamicMapLoader;
