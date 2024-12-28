import {Fragment} from 'react';
import {Input, IconButton} from 'figma-kit';

interface SearchBarProps {
  searchQuery: string,
  setSearchQuery: (value: string) => void,
  setSearchMode: (value: boolean) => void,
}

export function SearchBar(props: SearchBarProps) {
  return (
    <Fragment>
      <Input
        autoFocus
        title="Search"
        placeholder="Find..."
        style={{marginLeft: '8px', width: '100%'}}
        value={props.searchQuery}
        onChange={(e) => {
          const {value} = e.currentTarget;
          props.setSearchQuery(value);
          if (!value) {
            props.setSearchMode(false);
          }
        }}
      />           
      <IconButton
        aria-label="Exit search"
        style={{margin: '8px'}}
        onClick={() => {
          props.setSearchQuery('');
          props.setSearchMode(false);
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
          <path
            fill="var(--figma-color-icon)"
            fillOpacity="1"
            fillRule="nonzero"
            stroke="none"
            d="m6 5.293 4.789-4.79.707.708-4.79 4.79 4.79 4.789-.707.707-4.79-4.79-4.789 4.79-.707-.707L5.293 6 .502 1.211 1.21.504z">
          </path>
        </svg>
      </IconButton>
    </Fragment>
  );
}
