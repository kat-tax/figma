import {useWindowSize} from '@uidotdev/usehooks';
import {useEffect, useState, Fragment} from 'react';
import {Tabs, Text, IconButton} from 'figma-kit';
import {Dropdown, IconEllipsis32, IconLayerComponent16} from 'figma-ui';
import {patch, actions} from 'interface/utils/editor/lib/prompts';
import {SearchBar} from 'interface/base/SearchBar';
import {titleCase} from 'common/string';

import type {DropdownOption} from 'figma-ui';
import type {AppTabs, AppPages, AppPagesMain} from 'types/app';
import type {ComponentBuild} from 'types/component';
import type {Navigation} from 'interface/hooks/useNavigation';

interface NavBarProps {
  nav: Navigation,
  tabs: AppTabs,
  build: ComponentBuild,
  isVSCode: boolean,
  searchMode: boolean,
  searchQuery: string,
  setSearchQuery: React.Dispatch<string>,
  setSearchMode: React.Dispatch<boolean>,
}

export function NavBar(props: NavBarProps) {
  const {width} = useWindowSize();
  const [mainTabs, setMainTabs] = useState<Array<AppPagesMain>>([]);

  const hasBack = props.nav.tab.includes('/');
  const hasTarget = Boolean(props.nav.component);
  const hasChanges = false;
  const hasDropModMenu = !hasTarget;
  const isTargetInRoster = hasTarget && props.build.roster[props.nav.component];
  const hasDropModTargetUnsaved = hasTarget && hasChanges;
  const classMenu = hasDropModMenu
    ? 'drop-mod-menu'
    : hasDropModTargetUnsaved
      ? 'drop-mod-target-unsaved'
      : hasTarget
        ? 'drop-mod-target'
        : '';

  const menuMainExt: Array<DropdownOption> = props.tabs.main
    .filter(page => !mainTabs.includes(page))
    .map(value => ({
      value,
      text: titleCase(value.toString(),
    )}) as DropdownOption);

  const menuComponent: Array<DropdownOption> = Object
    .entries(props.build.roster)
    .sort(([,a], [,b]) => a.name?.localeCompare(b.name))
    .map(([name, component]) => ({
      value: name,
      text: component.name,
      disabled: component.loading,
    }));

  const menuComponentUnsaved: Array<DropdownOption> = actions.map(action => ({
    value: action,
    text: titleCase(action),
  }));

  useEffect(() => {
    const tabs: Array<AppPagesMain> = [];
    let spaceLeft = width - 100;
    let i = 0;
    for (const name of props.tabs.main) {
      const tab = (16.5 + name.length * 5.5);
      const mod = i === props.tabs.main.length - 1
        ? tab - 40
        : i === 3
          ? tab - 17
          : tab;
      if (mod < spaceLeft) {
        tabs.push(name);
        spaceLeft -= tab;
        i++;
      } else {
        break;
      }
    }
    setMainTabs(tabs);
  }, [props.tabs, width]);

  return (
    <div className={`tab-menu ${classMenu} ${props.searchMode ? 'search-mode' : ''}`}>
      <Tabs.List loop aria-label="menu">
        {hasTarget
        ? <div className="tab-bar-nav">
            {hasBack &&
              <IconButton
                aria-label="Go back to project"
                className="tab-btn"
                onKeyDown={props.nav.gotoOverview}
                onClick={props.nav.gotoOverview}>
                <svg style={{rotate: '180deg'}} width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path
                    fill="var(--figma-color-icon)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M13.146 7.146a.5.5 0 0 1 .707 0l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.707-.708L16.293 12H6.5a.5.5 0 0 1 0-1h9.793l-3.146-3.146a.5.5 0 0 1 0-.708">
                  </path>
                </svg>
              </IconButton>
            }
            {props.tabs.component
              .map(page => {
                const [group, name] = page.split('/');
                return (
                  <Fragment key={page.toString()}>
                    <Tabs.Trigger
                      title={`${titleCase(group)} ${titleCase(name)}`}
                      value={page.toString()}>
                      <Text>{titleCase(name)}</Text>
                    </Tabs.Trigger>
                  </Fragment>
                );
              })}
          </div>
        : <Fragment>
          {props.searchMode
          ? <SearchBar
              searchQuery={props.searchQuery}
              setSearchQuery={props.setSearchQuery}
              setSearchMode={props.setSearchMode}
            />
          : <div className="tab-bar-nav">
              <IconButton
                aria-label="Enter search"
                className="tab-btn"
                onKeyDown={() => props.setSearchMode(true)}
                onClick={() => props.setSearchMode(true)}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path
                    fill="var(--figma-color-icon)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15 10.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0m-.956 4.206a5.5 5.5 0 1 1 .662-.662.5.5 0 0 1 .148.102l3 3a.5.5 0 1 1-.707.707l-3-3a.5.5 0 0 1-.103-.147"
                  />
                </svg>
              </IconButton>
              {mainTabs.map(page => (
                <Fragment key={page.toString()}>
                  <Tabs.Trigger
                    title={`Project ${titleCase(page.toString())}`}
                    value={page.toString()}>
                    <Text>{titleCase(page.toString())}</Text>
                  </Tabs.Trigger>
                </Fragment>
              ))}
            </div>
          }
          </Fragment>
        }
      </Tabs.List>
      {!hasTarget && !props.searchMode && menuMainExt.length > 0 &&
        <Dropdown
          icon={<IconEllipsis32/>}
          options={menuMainExt}
          value={!mainTabs.includes(props.nav.tab as AppPagesMain) ? props.nav.tab : null}
          onChange={(e) => props.nav.gotoTab(e.currentTarget.value as AppPages)}
        />
      }
      {hasTarget && !hasChanges &&
        <Dropdown
          icon={<IconLayerComponent16 color="component"/>}
          options={menuComponent}
          placeholder="Select a component"
          value={isTargetInRoster ? props.nav.component : null}
          onChange={(e) => props.nav.setComponent(e.currentTarget.value)}
        />
      }
      {hasTarget && hasChanges &&
        <Dropdown
          icon={<IconLayerComponent16 color="warning"/>}
          options={menuComponentUnsaved}
          placeholder="Review changes"
          value={null}
          onChange={(e) => patch(e.currentTarget.value)}
        />
      }
    </div>
  );
}
