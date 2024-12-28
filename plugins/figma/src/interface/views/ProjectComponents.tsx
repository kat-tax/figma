import {Fzf, byLengthAsc} from 'fzf';
import {useState, useMemo, useEffect} from 'react';
import {Stack, Layer, Button, Disclosure, IconWarning16, IconLayerComponent16} from 'figma-ui';
import {ProjectAssets} from 'interface/views/ProjectAssets';
import {TextCollabDots} from 'interface/base/TextCollabDots';
import {TextUnderline} from 'interface/base/TextUnderline';
import {ScreenInfo} from 'interface/base/ScreenInfo';
import {emit} from '@create-figma-plugin/utilities';
import * as $ from 'store';

import type {Navigation} from 'interface/hooks/useNavigation';
import type {ComponentBuild, ComponentRosterEntry} from 'types/component';
import type {EventNotify, EventFocusNode, EventProjectImportComponents} from 'types/events';

interface ProjectComponentsProps {
  build: ComponentBuild,
  nav: Navigation,
  iconSet: string,
  hasIcons: boolean,
  hasStyles: boolean,
  isReadOnly: boolean,
  searchMode: boolean,
  searchQuery: string,
}

type ProjectComponentIndex = Record<
  string,
  ProjectComponentEntry[]
>

type ProjectComponentEntry = {
  item: ComponentRosterEntry & {key: string},
  positions: Set<number>,
}

export function ProjectComponents(props: ProjectComponentsProps) {
  const [importing, setImporting] = useState(false);
  const [list, setList] = useState<ProjectComponentIndex>({});

  const hasImport = !props.isReadOnly && false;
  const hasComponents = Boolean(props.build?.roster && Object.keys(props.build.roster).length);
  
  const index = useMemo(() => {
    const _entries = hasComponents ? Object.entries(props.build?.roster) : [];
    const entries = _entries
      .sort((a, b) => a[1].path?.localeCompare(b[1].path))
      .map(([key, item]) => ({...item, key}));
    return new Fzf(entries, {
      selector: (item) => `${item.page}/${item.name}`,
      tiebreakers: [byLengthAsc],
      forward: false,
    });
  }, [props?.build, hasComponents]);

  // Import EXO components
  const importComponents = async () => {
    if (!props.hasStyles) {
      props.nav.gotoTab('theme');
      emit<EventNotify>('NOTIFY', 'Generate a theme before importing EXO');
      return;
    }
    if (!props.hasIcons) {
      props.nav.gotoTab('icons');
      emit<EventNotify>('NOTIFY', 'Generate icons before importing EXO');
      return;
    }
    const choice = confirm('Warning! Importing components will overwrite the "Common" and "Primitives" pages if they exist.\n\nContinue?');
    if (!choice) return;
    setImporting(true);
    emit<EventProjectImportComponents>('PROJECT_IMPORT_COMPONENTS', props.iconSet);
  };
  

  const select = (id: string) => {
    emit<EventFocusNode>('NODE_FOCUS', id);
  };

  useEffect(() => {
    const entries = index.find(props.searchQuery);
    const newList: ProjectComponentIndex = hasComponents
      ? Object.values(entries).reduce((group, entry) => {
        const {item, positions} = entry;
          group[item.page] = [
            ...(group[item.page] || []),
            {item, positions},
          ];
          return group;
        }, {})
      : {};
    setList(newList);
  }, [index, props.searchQuery, hasComponents]);

  if (!hasComponents) {
    return (
      <ScreenInfo
        message="No components found"
        action={hasImport
          ? <Button
              secondary
              loading={importing}
              onClick={() => importComponents()}>
              Import from EXO
            </Button>
          : null
        }
      />
    );
  }

  return (
    <div
      className="components"
      style={{
        flex: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}>
      {props.build?.pages?.map(page =>        
        <ProjectPageGroup
          key={page}
          title={page}
          onSelect={select}
          entries={list[page]}
        />
      )}
      <ProjectPageGroup
        title="Assets"
        onSelect={select}
        component={<ProjectAssets {...props}/>}
      />
    </div>
  );
}

interface ProjectPageGroupProps {
  title: string;
  entries?: ProjectComponentEntry[],
  component?: JSX.Element,
  onSelect: (id: string) => void;
}

function ProjectPageGroup(props: ProjectPageGroupProps) {
  const [isExpanded, setExpanded] = useState<boolean>(true);
  if (!props?.entries?.length) return null;

  return (
    <Disclosure
      style={{width: '100%'}}
      title={props.title}
      open={isExpanded}
      onClick={() => setExpanded(!isExpanded)}>
      {props?.component}
      {props?.entries?.map(entry =>
        <ProjectPageComponent
          key={entry.item.key}
          entry={entry}
          page={props.title}
          onSelect={props.onSelect}
        />
      )}
    </Disclosure>
  );
}

interface ProjectPageComponentProps {
  page: string,
  entry: ProjectComponentEntry,
  onSelect: (id: string) => void,
}

function ProjectPageComponent(props: ProjectPageComponentProps) {
  const {id, name, page, path, preview, loading} = props.entry.item;
  const [dragging, setDragging] = useState<string | null>(null);
  const hasUnsavedChanges = false;
  const hasError = false;

  return (
    <Stack
      space="extraLarge"
      style={{width: '100%'}}
      draggable={!loading}
      onDragEnd={(e) => {
        setDragging(null);
        window.parent.postMessage({
          pluginDrop: {
            clientX: e.clientX,
            clientY: e.clientY,
            items: [{
              type: 'figma/node-id',
              data: id,
            }],
          }
        }, '*');
      }}
      onDragStart={(e) => {
        setDragging(name);
        const $code = $.component.code(name);
        const code = $code.get().toString();
        const img = new Image(100, 100);
        img.src = preview;
        e.dataTransfer.setDragImage(img, 0, 0);
        e.dataTransfer.setData('text/plain', code);
      }}>
      <Layer
        component={!hasError}
        value={name === dragging}
        onChange={() => id
          ? props.onSelect(id)
          : undefined
        }
        description={loading
          ? 'loading...'
          : hasError
            ? 'error'
            : hasUnsavedChanges
              ? 'modified'
              : path.split('/').slice(2, -1).join('/')
        }
        icon={hasError
          ? <IconWarning16 color="danger"/>
          : <IconLayerComponent16 color="component"/>
        }>
        <TextUnderline
          str={`${page}/${name}`}
          indices={props.entry.positions}
        />
        <TextCollabDots target={name}/>
      </Layer>
    </Stack>
  );
}
