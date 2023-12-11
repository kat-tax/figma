import {h, Fragment} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useWindowSize} from "@uidotdev/usehooks";
import {Bar, Link} from 'interface/base/Tabs';
import {SearchBar} from 'interface/base/SearchBar';
import {changes, actions} from 'interface/utils/changes';

import * as F from '@create-figma-plugin/ui';

import type {StateUpdater} from 'preact/hooks';
import type {ComponentBuild} from 'types/component';
import type {AppTabs, AppPages, AppPagesMain} from 'types/app';
import type {Navigation} from 'interface/hooks/useNavigation';
import {titleCase} from 'common/string';

interface NavBarProps {
  nav: Navigation,
  tabs: AppTabs,
  build: ComponentBuild,
  setSearchQuery: StateUpdater<string>,
  setSearchMode: StateUpdater<boolean>,
  searchQuery: string,
  searchMode: boolean,
}

export function NavBar(props: NavBarProps) {
  const {width} = useWindowSize();
  const [mainTabs, setMainTabs] = useState<Array<AppPagesMain>>([]);

  const hasTarget = Boolean(props.nav.component);
  const hasChanges = false;
  const hasDropModMenu = !hasTarget;
  const hasDropModTargetUnsaved = hasTarget && hasChanges;
  const classMenu = hasDropModMenu
    ? 'drop-mod-menu'
    : hasDropModTargetUnsaved
      ? 'drop-mod-target-unsaved'
      : hasTarget
        ? 'drop-mod-target'
        : '';

  const menuMainExt: Array<F.DropdownOption> = props.tabs.main
    .filter(page => !mainTabs.includes(page))
    .map(value => ({
      value,
      text: titleCase(value.toString(),
    )}) as F.DropdownOption);

  const menuComponent: Array<F.DropdownOption> = Object
    .entries(props.build.roster)
    .sort(([,a], [,b]) => a.name.localeCompare(b.name))
    .map(([name, component]) => ({
      value: name,
      text: component.name,
      disabled: component.loading,
    }));

  const menuComponentUnsaved: Array<F.DropdownOption> = actions.map(action => ({
    value: action,
    text: titleCase(action),
  }));

  useEffect(() => {
    const tabs: Array<AppPagesMain> = [];
    let spaceLeft = width - 100;
    let i = 0;
    for (const name of props.tabs.main) {
      const tab = (16.5 + name.length * 5.5);
      const mod =  i === props.tabs.main.length - 1
        ? tab - 40
        : i === 2
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
    <div className={`tab-menu ${classMenu}`}>
      <Bar loop aria-label="menu">
        {hasTarget
        ? <div className="tab-bar-nav">
            <div
              title="Go back to project"
              className="tab-btn"
              style={{paddingTop: '1px'}}
              onClick={props.nav.gotoOverview}>
              <F.IconNavigateBack32/>
            </div>
            {props.tabs.component
              .map(page => (
                <Fragment key={page}>
                  <Link
                    title={`Component ${titleCase(page.toString())}`}
                    value={page.toString()}>
                    {titleCase(page.toString())}
                  </Link>
                </Fragment>
              ))}
          </div>
        : <Fragment>
          {props.searchMode
          ? <SearchBar
              searchQuery={props.searchQuery}
              setSearchQuery={props.setSearchQuery}
              setSearchMode={props.setSearchMode}
              gotoOverview={props.nav.gotoOverview}
            />
          : <div className="tab-bar-nav">
              <div
                className="tab-btn"
                title="Search components"
                onClick={() => props.setSearchMode(true)}>
                <F.IconSearch32/>
              </div>
              {mainTabs.map(page => (
                <Fragment key={page}>
                  <Link
                    title={`Project ${titleCase(page.toString())}`}
                    value={page.toString()}>
                    {titleCase(page.toString())}
                  </Link>
                </Fragment>
              ))}
            </div>
          }
          </Fragment>
        }
      </Bar>
      {!hasTarget && !props.searchMode && menuMainExt.length > 0 &&
        <F.Dropdown
          options={menuMainExt}
          value={!mainTabs.includes(props.nav.tab) ? props.nav.tab : null}
          icon={<F.IconEllipsis32/>}
          onChange={(e) => props.nav.gotoTab(e.currentTarget.value as AppPages)}
        />
      }
      {hasTarget && !hasChanges &&
        <F.Dropdown
          options={menuComponent}
          placeholder="Select a component"
          value={props.nav.component}
          icon={<F.IconLayerComponent16 color="component"/>}
          onChange={(e) => props.nav.setComponent(e.currentTarget.value)}
        />
      }
      {hasTarget && hasChanges &&
        <F.Dropdown
          options={menuComponentUnsaved}
          placeholder="Review changes"
          value={null}
          icon={<F.IconLayerComponent16 color="warning"/>}
          onChange={(e) => changes(e.currentTarget.value)}
        />
      }
    </div>
  );
}
