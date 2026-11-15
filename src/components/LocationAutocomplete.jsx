// FIND LOCATION: typing waits 500ms before searching; old responses are ignored.
import React, { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { createLocation, isMapLocation, parseCoordinateQuery } from '../lib/location-tools';
import { suggestLocations } from '../lib/location-autocomplete';

export default function LocationAutocomplete({ onSelect }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Type at least 3 characters for suggestions.');
  const inputId = useId();
  const listId = inputId + '-suggestions';
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const pending = useRef({ id: 0, timer: null, timeout: null, controller: null });

  // Cancel timers AND the request when typing, closing the tab, or unmounting.
  function cancelSearch() {
    const work = pending.current;
    work.id += 1;
    clearTimeout(work.timer);
    clearTimeout(work.timeout);
    work.controller?.abort();
  }
  useEffect(() => () => cancelSearch(), []);
  useEffect(function scrollActiveSuggestion() {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  async function runSearch(text) {
    cancelSearch();
    const work = pending.current;
    const id = work.id;
    work.controller = new AbortController();
    setBusy(true);
    setMessage('Searching locations…');
    work.timeout = setTimeout(() => {
      if (id !== pending.current.id) return;
      cancelSearch();
      setBusy(false);
      setMessage('Search timed out. Try again, enter coordinates, or select a map point.');
    }, 12000);
    try {
      const matches = await suggestLocations(text, work.controller.signal);
      if (id !== pending.current.id) return;
      setPlaces(matches);
      setExpanded(matches.length > 0 && document.activeElement === inputRef.current);
      setActiveIndex(-1);
      setMessage(matches.length ? matches.length + ' matching locations. Use the arrow keys to choose.' : 'No matching locations. Try another name or enter latitude, longitude.');
    } catch (error) {
      if (id === pending.current.id && error.name !== 'AbortError') {
        setMessage('Location search is unavailable. Enter coordinates or select a map point.');
      }
    } finally {
      if (id === pending.current.id) {
        clearTimeout(work.timeout);
        setBusy(false);
      }
    }
  }

  function changeQuery(event) {
    const value = event.target.value;
    cancelSearch();
    setQuery(value);
    setPlaces([]);
    setExpanded(false);
    setActiveIndex(-1);
    setBusy(false);
    const text = value.trim();
    if (parseCoordinateQuery(text)) {
      setMessage('Press Find to go to these coordinates.');
    } else if (text.length < 3) {
      setMessage('Type at least 3 characters for suggestions.');
    } else {
      setMessage('Waiting for typing to finish…');
      pending.current.timer = setTimeout(() => runSearch(text), 500);
    }
  }

  function choosePlace(place) {
    cancelSearch();
    setBusy(false);
    setQuery(place.title);
    setPlaces([]);
    setExpanded(false);
    setActiveIndex(-1);
    setMessage('Location selected on the map.');
    onSelect(place, false);
  }

  function submitSearch(event) {
    event.preventDefault();
    const text = query.trim();
    const coordinates = parseCoordinateQuery(text);
    if (coordinates) {
      cancelSearch();
      setBusy(false);
      setPlaces([]);
      setExpanded(false);
      if (!isMapLocation(coordinates.latitude, coordinates.longitude)) {
        setMessage('Enter coordinates inside the Philippines map extent.');
        return;
      }
      setMessage('Location selected on the map.');
      onSelect(createLocation(coordinates.latitude, coordinates.longitude));
    } else if (text.length >= 2) {
      // Keep the input focused so results are available to keyboard users.
      inputRef.current?.focus();
      runSearch(text);
    } else {
      setMessage('Enter a place name or latitude, longitude.');
    }
  }

  function handleKeys(event) {
    if (event.nativeEvent.isComposing) return;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && places.length) {
      event.preventDefault();
      setExpanded(true);
      setActiveIndex(index => event.key === 'ArrowDown' ? (index + 1) % places.length : (index <= 0 ? places.length - 1 : index - 1));
    } else if (event.key === 'Enter' && expanded && activeIndex >= 0) {
      event.preventDefault();
      choosePlace(places[activeIndex]);
    } else if (event.key === 'Escape') {
      // First Escape dismisses suggestions; the tool's close button stays available.
      event.stopPropagation();
      cancelSearch();
      setBusy(false);
      setExpanded(false);
      setActiveIndex(-1);
      setMessage('Suggestions dismissed. Keep typing or press Find to search.');
    }
  }

  return (
    <form className="location-find-form" onSubmit={submitSearch}>
      <label htmlFor={inputId}>Place name or latitude, longitude</label>
      <div className="location-search-row">
        <input ref={inputRef} id={inputId} role="combobox" aria-autocomplete="list"
          aria-expanded={expanded} aria-controls={listId} aria-describedby={inputId + '-status'}
          aria-activedescendant={expanded && activeIndex >= 0 ? listId + '-' + activeIndex : undefined}
          autoComplete="off" spellCheck={false} value={query} onChange={changeQuery}
          onFocus={() => { if (places.length) setExpanded(true); }}
          onBlur={event => {
            // Clicking an option may focus it before its click arrives.
            // Keep the list mounted until that selection is handled.
            if (listRef.current?.contains(event.relatedTarget)) return;
            setExpanded(false); setActiveIndex(-1);
          }}
          onKeyDown={handleKeys} placeholder="Nabua or 13.4051, 123.3725" />
        <button type="submit" className="location-find-button" aria-label="Find location" aria-busy={busy}>
          <Search size={14} aria-hidden="true" /><span>Find</span>
        </button>
      </div>
      {expanded && <ul ref={listRef} id={listId} className="location-suggestions" role="listbox" aria-label="Matching locations">
        {places.map((place, index) => <li key={place.key} id={listId + '-' + index} role="option" tabIndex={-1}
          aria-selected={index === activeIndex} onMouseDown={event => event.preventDefault()}
          onClick={() => choosePlace(place)}>
          <b>{place.title}</b><small>{place.address}</small>
        </li>)}
      </ul>}
      <p id={inputId + '-status'} className="location-search-status" role="status">{message}</p>
    </form>
  );
}
