import {useState, useEffect} from 'react';
import {on} from '@create-figma-plugin/utilities';

import type {EventProjectBackground} from 'types/events';

export function useProjectBackground(): string {
  const [background, setBackground] = useState('#000');

  useEffect(() => on<EventProjectBackground>('PROJECT_BACKGROUND', (color) => {
    setBackground(color);
  }), []);

  return background;
}
