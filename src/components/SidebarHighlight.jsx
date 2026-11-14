// Moves the active background between the ordinary sidebar buttons in App.jsx.
import React, { useLayoutEffect, useRef, useState } from 'react';

export default function SidebarHighlight({ page }) {
  const highlightRef = useRef(null);
  const [position, setPosition] = useState({ opacity: 0 });

  useLayoutEffect(function followActiveButton() {
    const navigation = highlightRef.current.parentElement;

    function updatePosition() {
      const activeButton = navigation.querySelector('.sidebar-button-active');
      if (activeButton) {
        setPosition({
          width: activeButton.offsetWidth,
          height: activeButton.offsetHeight,
          transform: 'translate(' + activeButton.offsetLeft + 'px, ' + activeButton.offsetTop + 'px)',
          opacity: 1,
        });
      }
    }

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(navigation);
    for (const button of navigation.querySelectorAll('button')) {
      observer.observe(button);
    }

    return function stopFollowing() {
      observer.disconnect();
    };
  }, [page]);

  return <div ref={highlightRef} className="sidebar-active-highlight" style={position} aria-hidden="true" />;
}
