// Toolbar actions: downloading stays local; sharing only opens the user's chosen app.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Share2, Copy, Mail, X, ExternalLink } from 'lucide-react';
import { createMapViewLink, isLocalViewLink, shareTargets } from '../lib/map-share';
import { captureMap, downloadMap } from '../lib/map-capture';
import './map-export.css';

function ShareDialog({ link, onClose }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const [status, setStatus] = useState('');
  const [sharing, setSharing] = useState(false);
  const targets = shareTargets(link);

  useEffect(function openDialog() {
    dialogRef.current.showModal();
    return () => dialogRef.current?.close();
  }, []);

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(link);
      setStatus('Map link copied.');
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      setStatus('Select and copy the link manually using your browser or keyboard.');
    }
  }
  async function shareWithApp() {
    setSharing(true);
    try {
      await navigator.share({ title: 'TANAW map view', text: 'Explore this thermal activity map', url: link });
      setStatus('Share action completed.');
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'Sharing canceled.' : 'Sharing is unavailable here. Copy the link or choose an option below.');
    } finally { setSharing(false); }
  }

  return createPortal(
    <dialog ref={dialogRef} className="map-share-dialog" aria-labelledby="map-share-title"
      onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <header><div><small>TANAW / MAP VIEW</small><h2 id="map-share-title">Share this map</h2></div><button type="button" aria-label="Close share options" onClick={onClose}><X size={20} /></button></header>
      <p>The link restores the map position, zoom, month, sensors, layers, and timeline settings. Saved locations stay in this browser.</p>
      {isLocalViewLink(link) && <p className="map-share-notice">This is a local preview link. Other people need a link from your published website to open it on their devices.</p>}
      <label htmlFor="map-share-link">Map view link</label>
      <div className="map-share-link-row"><input ref={inputRef} id="map-share-link" readOnly value={link} onFocus={event => event.target.select()} /><button type="button" onClick={copyLink}><Copy size={16} /> Copy link</button></div>
      <div className="map-share-options">
        <a href={targets.email} onClick={() => setStatus('Continue in your email app. If no draft opens, choose Gmail or Outlook below.')}><Mail size={17} /> Email app</a>
        <a href={targets.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setStatus('Continue in WhatsApp to choose a recipient. Sign in if prompted. Link ready to copy if the app is unavailable. ')}>WhatsApp <ExternalLink size={13} /></a>
        <a href={targets.telegram} target="_blank" rel="noopener noreferrer" onClick={() => setStatus('Continue in Telegram to choose a recipient. Sign in if prompted. Link ready to copy if the app is unavailable. ')}>Telegram <ExternalLink size={13} /></a>
        <a href={targets.facebook} target="_blank" rel="noopener noreferrer" onClick={() => setStatus(isLocalViewLink(link) ? 'Facebook needs a publicly accessible website link. Publish your website, then generate the map link there.' : 'Continue in Facebook to review and share the link. Sign in if prompted.')}>Facebook <ExternalLink size={13} /></a>
        {typeof navigator.share === 'function' && <button type="button" disabled={sharing} onClick={shareWithApp}><Share2 size={16} /> More apps</button>}
      </div>
      <div className="map-share-webmail" aria-label="Web email options"><span>No default email app?</span><a href={targets.gmail} target="_blank" rel="noopener noreferrer">Gmail</a><a href={targets.outlook} target="_blank" rel="noopener noreferrer">Outlook</a></div>
      <p className="map-share-hint">Email opens a draft in your email app. Platform options open their sharing page so you can choose the recipient and send.</p>
      <p className="map-share-status" role="status">{status}</p>
    </dialog>, document.body,
  );
}

export default function MapExportTools({ mapReference, settings, loading }) {
  const [capturing, setCapturing] = useState(false);
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('');
  const captureController = useRef(null);
  useEffect(() => () => captureController.current?.abort(), []);

  async function capture() {
    if (captureController.current) return;
    const controller = new AbortController();
    captureController.current = controller;
    setCapturing(true);
    setStatus('Preparing map image…');
    try {
      const blob = await captureMap(mapReference.current, controller.signal);
      if (controller.signal.aborted) return;
      downloadMap(blob, settings.timelineOpen ? settings.timelineDate : settings.month);
      setStatus('Map PNG downloaded.');
    } catch (error) {
      if (!controller.signal.aborted) setStatus(error.message || 'Map capture failed. Please try again.');
    } finally {
      captureController.current = null;
      if (!controller.signal.aborted) setCapturing(false);
    }
  }
  function openShare() {
    try { setLink(createMapViewLink(window.location.href, mapReference.current, settings)); }
    catch (error) { setStatus(error.message); }
  }

  return <>
    <button type="button" aria-label="Capture map image" disabled={capturing || loading} aria-busy={capturing} onClick={capture}><Camera size={21} /><span>{capturing ? 'Capturing…' : 'Capture'}</span></button>
    <button type="button" aria-label="Share map view" onClick={openShare}><Share2 size={21} /><span>Share</span></button>
    {link && <ShareDialog link={link} onClose={() => setLink('')} />}
    {status && createPortal(<div className="map-export-status" role="status"><span>{status}</span><button type="button" aria-label="Dismiss capture message" onClick={() => setStatus('')}><X size={16} /></button></div>, document.body)}
  </>;
}
