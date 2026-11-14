// EDIT HERE: Popup title, close button, chart position, and table position.
// Chart values: ObservationPieChart.jsx. Table headings: ObservationTable.jsx.
import React, { useEffect, useRef } from 'react';
import ObservationPieChart from './ObservationPieChart';
import ObservationTable from './ObservationTable';

export default function DatePopup({ date, onClose }) {
  const popupRef = useRef(null);

  useEffect(() => {
    const popup = popupRef.current;
    const previouslyFocusedButton = document.activeElement;

    if (!popup.open) {
      popup.showModal();
    }

    return () => {
      popup.close();
      if (previouslyFocusedButton) {
        previouslyFocusedButton.focus();
      }
    };
  }, []);

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
          <div className="section-caption">DAILY OBSERVATIONS / UTC</div>
          <h2 id="date-dialog-title">{date}</h2>
        </div>

        <button
          type="button"
          className="date-popup-close-button"
          onClick={onClose}
          aria-label="Close date details"
          autoFocus
        >
          <i className="fi fi-br-circle-xmark" aria-hidden="true" />
        </button>
      </div>
      <ObservationPieChart />

      <ObservationTable />
    </dialog>
  );
}
