import React, { useEffect, useState } from 'react';

import { Canvas, Source, Story, Title } from '@storybook/addon-docs/blocks';

import * as ButtonStories from './Button.stories.ts';

export default function ButtonDocs() {
  const [sourceCode, setSourceCode] = useState<string>('Loading source...');

  useEffect(() => {
    const fetchSource = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.STORYBOOK_SYMFONY_URL ?? ''}/_storybook/source/Button`
        );
        if (!response.ok) {
          setSourceCode('// Source not available');
          return;
        }
        const data = await response.json();
        setSourceCode(data.template ?? '// Source not available');
      } catch {
        setSourceCode('// Source not available');
      }
    };
    fetchSource();
  }, []);

  return (
    <>
      <Title />
      <Canvas>
        <Story of={ButtonStories.Primary} />
      </Canvas>
      <Source code={sourceCode} language="twig" />
    </>
  );
}
