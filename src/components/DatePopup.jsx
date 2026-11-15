
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import ObservationPieChart from './ObservationPieChart';
import ObservationTable from './ObservationTable';

export default function DatePopup({ date, onClose }) {
  const popupRef = useRef(null);

  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Open the popup.
  useEffect(() => {
    const popup = popupRef.current;
    const previouslyFocusedElement = document.activeElement;

    if (!popup.open) {
      popup.showModal();
    }

    return () => {
      if (popup.open) {
        popup.close();
      }

      previouslyFocusedElement?.focus?.();
    };
  }, []);

  // Fetch observations for the selected date.
  useEffect(() => {
    let cancelled = false;

    async function fetchObservations() {
      setLoading(true);
      setError(null);
      setObservations([]);

      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      try {
        const allObservations = [];
        const pageSize = 1000;
        let offset = 0;

        // Fetch all records, including days with over 1000 rows.
        while (true) {
          const { data, error: queryError } = await supabase
            .from('fire_observations')
            .select(
              'id, sensor, satellite, latitude, longitude, frp, confidence, acq_date'
            )
            .eq('acq_date', date)
            .order('id', { ascending: true })
            .range(offset, offset + pageSize - 1);

          if (queryError) {
            throw queryError;
          }

          if (cancelled) return;

          allObservations.push(...(data ?? []));

          if (!data || data.length < pageSize) {
            break;
          }

          offset += pageSize;
        }

        if (!cancelled) {
          setObservations(allObservations);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load observations.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchObservations();

    return () => {
      cancelled = true;
    };
  }, [date]);

  function handleEscape(event) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={popupRef}
      className="date-popup"
      aria-labelledby="date-dialog-title"
      onCancel={handleEscape}
    >
      <div className="date-popup-header">
        <div>
          <div className="section-caption">
            DAILY OBSERVATIONS / UTC
          </div>
          <h2 id="date-dialog-title">{date}</h2>
        </div>

        <button
          type="button"
          className="date-popup-close-button"
          onClick={onClose}
          aria-label="Close date details"
          autoFocus
        >
          <i
            className="fi fi-br-circle-xmark"
            aria-hidden="true"
          />
        </button>
      </div>

      {loading ? (
        <p>Loading observations...</p>
      ) : error ? (
        <p role="alert">
          Error loading observations: {error}
        </p>
      ) : (
        <>
          <ObservationPieChart observations={observations} />
          <ObservationTable observations={observations} />
        </>
      )}
    </dialog>
  );
}
