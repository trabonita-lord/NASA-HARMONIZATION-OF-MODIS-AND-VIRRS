// LOCATION TOOL: Only the three reference tabs, selection controls, and saved pins.
import React, { useEffect, useRef, useState } from 'react';
import { Pane, useMapEvents } from 'react-leaflet';
import { DomEvent } from 'leaflet';
import { Crosshair, Search, Flag, MapPin, Trash2, X } from 'lucide-react';
import LocationPin from './LocationPin';
import LocationAutocomplete from './LocationAutocomplete';
import {
  SAVED_LOCATIONS_KEY, createLocation, isMapLocation,
  readSavedLocations, reverseLocation,
} from '../lib/location-tools';
import './location-tool.css';

export default function LocationTool({ open, onClose }) {
  const [tab, setTab] = useState('current');
  const [multiple, setMultiple] = useState(false);
  const [selected, setSelected] = useState([]);
  const [activeKey, setActiveKey] = useState('');
  const [saved, setSaved] = useState(readSavedLocations);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const panelRef = useRef(null);
  const requestRef = useRef(0);
  const controllerRef = useRef(null);
  const timeoutRef = useRef(null);

  const map = useMapEvents({
    click(event) {
      if (open) selectLocation(createLocation(event.latlng.lat, event.latlng.lng));
    },
  });

  function cancelRequest() {
    requestRef.current += 1;
    controllerRef.current?.abort();
    clearTimeout(timeoutRef.current);
  }

  function beginRequest() {
    cancelRequest();
    const id = requestRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setNotice('');
    timeoutRef.current = setTimeout(function stopSlowLookup() {
      if (id !== requestRef.current) return;
      cancelRequest();
      setBusy(false);
      setNotice('Location lookup timed out. You can still select a map point or enter coordinates.');
    }, 12000);
    return { id, signal: controller.signal };
  }

  function finishRequest(id) {
    if (id !== requestRef.current) return;
    clearTimeout(timeoutRef.current);
    setBusy(false);
  }

  useEffect(function isolatePanelEvents() {
    const panel = panelRef.current;
    if (panel) {
      DomEvent.disableClickPropagation(panel);
      DomEvent.disableScrollPropagation(panel);
    }
    if (!open) {
      cancelRequest();
      setBusy(false);
    }
  }, [open]);

  useEffect(function releasePendingWork() {
    return function cleanUp() { cancelRequest(); };
  }, []);

  function closeTool() {
    cancelRequest();
    setBusy(false);
    onClose();
  }

  async function selectLocation(place, findAddress = true) {
    if (!isMapLocation(place.latitude, place.longitude)) {
      setNotice('Choose a location inside the Philippines map extent.');
      return;
    }
    cancelRequest();
    setBusy(false);
    setNotice('');
    setSelected(previous => multiple ? [...previous.filter(item => item.key !== place.key), place] : [place]);
    setActiveKey(place.key);
    // Reopen the card even when this same place is chosen again.
    setSelectionVersion(value => value + 1);
    map.setView([place.latitude, place.longitude], Math.max(9, map.getZoom()));
    if (!findAddress) return;

    const request = beginRequest();
    try {
      const details = await reverseLocation(place.latitude, place.longitude, request.signal);
      if (request.id !== requestRef.current) return;
      setSelected(previous => previous.map(item => item.key === place.key ? details : item));
    } catch (error) {
      if (request.id === requestRef.current && error.name !== 'AbortError') {
        setNotice('Address unavailable. The selected coordinates are still accurate to the map point.');
      }
    } finally {
      finishRequest(request.id);
    }
  }

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setNotice('Your browser does not support location detection. Select a point on the map instead.');
      return;
    }
    if (!window.isSecureContext) {
      setNotice('Location detection needs HTTPS or localhost. Map selection and search remain available.');
      return;
    }
    const request = beginRequest();
    try {
      navigator.geolocation.getCurrentPosition(
      function locationFound(position) {
        if (request.id !== requestRef.current) return;
        finishRequest(request.id);
        const { latitude, longitude } = position.coords;
        selectLocation(createLocation(latitude, longitude));
      },
      function locationDenied(error) {
        if (request.id !== requestRef.current) return;
        finishRequest(request.id);
        setNotice(error.code === 1 ? 'Location permission was denied. You can click the map or use Find Location.' : 'Your location could not be detected. Try a map point or Find Location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    } catch {
      finishRequest(request.id);
      setNotice('Your browser could not request location access. Select a map point instead.');
    }
  }

  function changeTab(nextTab) {
    cancelRequest();
    setBusy(false);
    setNotice('');
    setTab(nextTab);
  }

  function saveLocation(place) {
    if (saved.some(item => item.key === place.key)) return;
    const next = [...saved, place];
    try {
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(next));
      setSaved(next);
      setNotice('Location saved in this browser.');
    } catch {
      setNotice('Browser storage is unavailable. This location could not be saved.');
    }
  }

  function removeSavedLocation(key) {
    const next = saved.filter(item => item.key !== key);
    try {
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(next));
      setSaved(next);
    } catch {
      setNotice('Browser storage is unavailable. The saved location was not removed.');
    }
  }

  function removeLocationFlag(key) {
    const next = selected.filter(item => item.key !== key);
    setSelected(next);
    if (activeKey === key) setActiveKey(next[next.length - 1]?.key || '');
    setNotice('Flag removed from the map. The saved location is still available in Saved Locations.');
  }

  function clearSelections() {
    cancelRequest();
    setBusy(false);
    setSelected([]);
    setActiveKey('');
    setSearchResetKey(value => value + 1);
    setNotice('');
  }

  function changeMultiple(checked) {
    setMultiple(checked);
    if (!checked) setSelected(previous => previous.slice(-1));
  }

  return (
    <>
      {open && (
        <section className="location-tool-panel" ref={panelRef} aria-label="Location tool" onKeyDown={event => { if (event.key === 'Escape') closeTool(); }}>
          <header className="location-tool-header"><h2>LOCATION TOOL</h2><button type="button" aria-label="Close location tool" onClick={closeTool}><X size={19} /></button></header>
          <div className="location-tool-tabs" role="tablist" aria-label="Location methods">
            <button type="button" role="tab" id="location-current-tab" aria-controls="location-tool-content" aria-selected={tab === 'current'} onClick={() => changeTab('current')}><Crosshair /><span>Current<br />Location</span></button>
            <button type="button" role="tab" id="location-find-tab" aria-controls="location-tool-content" aria-selected={tab === 'find'} onClick={() => changeTab('find')}><Search /><span>Find<br />Location</span></button>
            <button type="button" role="tab" id="location-saved-tab" aria-controls="location-tool-content" aria-selected={tab === 'saved'} onClick={() => changeTab('saved')}><Flag /><span>Saved<br />Locations</span></button>
          </div>
          <div className="location-tool-body" id="location-tool-content" role="tabpanel" aria-labelledby={'location-' + tab + '-tab'}>
            {tab === 'current' && <><button type="button" className="location-action-button" disabled={busy} onClick={detectCurrentLocation}><MapPin size={18} /> {busy ? 'FINDING LOCATION...' : 'AUTO DETECT YOUR LOCATION'}</button><p>You can also determine location by directly clicking on the map.</p></>}
            {tab === 'find' && <LocationAutocomplete key={searchResetKey} onSelect={selectLocation} />}
            {tab === 'saved' && <>{saved.length === 0 ? <p>No saved locations yet. Select a map point and click Save Location.</p> : <ul className="location-place-list">{saved.map(place => <li key={place.key}><button type="button" onClick={() => selectLocation(place, false)}><b>{place.title}</b><small>{place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}</small></button><button type="button" className="location-remove-saved" aria-label={'Remove saved location ' + place.title} onClick={() => removeSavedLocation(place.key)}><Trash2 size={16} /></button></li>)}</ul>}<small className="location-tool-caption">Saved on this browser only.</small></>}
            {notice && <p className="location-tool-notice" role="status">{notice}</p>}
         
          </div>
        </section>
      )}
      {/* Keep address cards above the floating tool on smaller screens. */}
      <Pane name="location-cards" style={{ zIndex: 900 }} />
      {selected.map(place => <LocationPin key={place.key} place={place} active={activeKey === place.key} selectionVersion={selectionVersion} saved={saved.some(item => item.key === place.key)} onSave={saveLocation} onRemove={removeLocationFlag} />)}
    </>
  );
}
