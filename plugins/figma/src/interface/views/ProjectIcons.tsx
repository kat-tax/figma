import {Fzf, byLengthAsc} from 'fzf';
import {Icon, listIcons, getIcon} from '@iconify/react';
import {useState, useEffect, useMemo, Fragment} from 'react';
import {useCopyToClipboard} from '@uidotdev/usehooks';
import {Button, IconButton} from 'figma-kit';
import {VirtuosoGrid} from 'react-virtuoso';
import {loadIconSet} from 'interface/services/iconify';
import {ProgressBar} from 'interface/base/ProgressBar';
import {ScreenInfo} from 'interface/base/ScreenInfo';
import {emit} from '@create-figma-plugin/utilities';

import type {Navigation} from 'interface/hooks/useNavigation';
import type {EventNotify, EventFocusNode, EventProjectImportIcons} from 'types/events';
import type {ProjectIcons as ProjectIconsType} from 'types/project';
import type {ComponentBuild} from 'types/component';

interface ProjectIconsProps {
  build: ComponentBuild,
  icons: ProjectIconsType,
  nav: Navigation,
  hasStyles: boolean,
  isReadOnly: boolean,
  searchMode: boolean,
  searchQuery: string,
}

type ProjectIconsEntry = {
  item: ProjectIcon,
  positions: Set<number>,
}

type ProjectIcon = {
  icon: string,
  nodeId: string,
  missing: boolean,
  used: boolean,
}

export function ProjectIcons(props: ProjectIconsProps) {
  const [list, setList] = useState<ProjectIconsEntry[]>([]);
  const [iconSet, setIconSet] = useState(props.icons?.sets?.[0]);
  const [importing, setImporting] = useState(false);
  const [loadedIcons, setLoadedIcons] = useState<string[]>([]);
  const [loadProgress, setLoadProgress] = useState(0);
  const [_copiedText, copyToClipboard] = useCopyToClipboard();

  // Rebuild list when icons or build or loadedIcons change
  const icons: ProjectIcon[] = useMemo(() => listIcons()
    .map(icon => ({
      icon,
      nodeId: props.icons?.map?.[icon],
      missing: !props.icons?.list?.includes(icon),
      used: props.build?.icons?.includes(icon),
    }))
    .sort((a, b) => {
      if (a.used && !b.used) return -1;
      if (!a.used && b.used) return 1;
      if (a.missing && !b.missing) return 1;
      if (!a.missing && b.missing) return -1;
      return 0;
    })
  , [props.icons, props.build, loadedIcons]);

  // Rebuild index when icons change
  const index = useMemo(() => new Fzf(icons, {
    selector: (item) => item.icon,
    tiebreakers: [byLengthAsc],
    forward: false,
  }), [icons]);

  // Import icons from Iconify into Figma
  const importIcons = async (prefix: string, name: string) => {
    if (!props.hasStyles) {
      props.nav.gotoTab('theme');
      emit<EventNotify>('NOTIFY', 'Generate a theme before importing icons');
      return;
    }
    const choice = confirm('Warning! Importing icons will overwrite the "Icons" page if it exists.\n\nContinue?');
    if (!choice) return;
    setImporting(true);
    setIconSet(prefix);
    const icons = await loadIconSet(prefix, setLoadProgress);
    const data = Object.fromEntries(icons.map(i => [i, getIcon(i).body]));
    emit<EventProjectImportIcons>('PROJECT_IMPORT_ICONS', name, data);
  };
  
  // Load icon set when selected
  useEffect(() => {
    if (!iconSet || importing) return;
    loadIconSet(iconSet, setLoadProgress).then(list => {
      setLoadedIcons(list);
    });
  }, [iconSet, importing]);

  // Update icon set when new icons are imported
  useEffect(() => {
    const set = props.icons?.sets?.[0];
    if (set) {
      setIconSet(props.icons?.sets?.[0]);
      setImporting(false);
    }
  }, [props.icons]);

  // Update list when search query changes or index changes
  useEffect(() => {
    const entries = index.find(props.searchQuery);
    setList(Object.values(entries));
  }, [index, props.searchQuery]);

  // Show no icons message
  if (!iconSet || !props.icons.sets?.length) {
    return (
      <ScreenInfo
        message="No icons found"
        action={!props.isReadOnly
          ? <Button
              secondary
              loading={importing}
              onClick={() => importIcons('ph', 'Phosphor')}>
              Import from Iconify
            </Button>
          : null
        }
      />
    );
  }

  // Showing loading bar
  if (loadProgress < 100) {
    return (
      <ProgressBar percent={`${loadProgress}%`}/>
    );
  }

  // Grid of icon buttons
  return (
    <Fragment>
      <VirtuosoGrid
        style={{height: '100%'}}
        overscan={200}
        totalCount={list.length}
        itemContent={i =>
          <IconListItem {...list[i].item} copy={copyToClipboard}/>
        }
      />
    </Fragment>
  );
}

interface IconListItemProps {
  icon: string,
  nodeId: string,
  missing: boolean,
  used: boolean,
  copy: (text: string) => void,
}

function IconListItem(props: IconListItemProps) {
  const tag = `<Icon name="${props.icon}"/>`;
  return (
    <IconButton
      size="medium"
      aria-label={props.icon}
      disabled={props.missing}
      draggable={!props.missing}
      onDoubleClick={() => emit<EventFocusNode>('NODE_FOCUS', props.nodeId)}
      onClick={() => {
        props.copy(tag);
        emit<EventNotify>('NOTIFY', `Copied "${props.icon}" tag to clipboard`);
      }}
      onDragStart={(e) => {e.dataTransfer.setData('text/plain', tag)}}
      onDragEnd={(e) => {
        window.parent.postMessage({
          pluginDrop: {
            clientX: e.clientX,
            clientY: e.clientY,
            items: [{
              type: 'figma/node-id',
              data: props.nodeId,
            }],
          }
        }, '*');
      }}>
      <Icon
        icon={props.icon}
        width={18}
        height={18}
        color={'var(--color-text)'}
      />
    </IconButton>
  );
}
