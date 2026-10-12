import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Marker } from 'maplibre-gl';
import { map } from './core/MapView';
import { toMapCoordinates } from './core/mapUtil';

const getLocationAge = (fixTime) => {
  if (!fixTime) {
    return 'Location time unavailable';
  }

  const timestamp = new Date(fixTime).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'Location time unavailable';
  }

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

  if (minutes < 1) {
    return 'Updated just now';
  }

  if (minutes < 60) {
    return `Updated ${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Updated ${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  return `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`;
};

// Bubbles are built once per device and then moved. Rebuilding them whenever a
// position changes would thrash the DOM, which matters now that animated fixes
// arrive every frame rather than every few seconds.
const createEntry = (onClick) => {
  const bubble = document.createElement('div');
  bubble.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      `;

  const card = document.createElement('div');
  card.style.cssText = `
        background: rgba(35, 37, 42, 0.96);
        color: #ffffff;
        border-radius: 14px;
        padding: 8px 14px;
        min-width: 100px;
        text-align: center;
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      `;

  const name = document.createElement('div');
  name.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        line-height: 19px;
      `;

  const status = document.createElement('div');
  status.style.cssText = `
        font-size: 11px;
        color: #c7c9ce;
        line-height: 16px;
      `;

  const pointer = document.createElement('div');
  pointer.style.cssText = `
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 7px solid rgba(35, 37, 42, 0.96);
      `;

  card.appendChild(name);
  card.appendChild(status);
  bubble.appendChild(card);
  bubble.appendChild(pointer);

  const entry = { bubble, name, status, fixTime: null, positionId: null, deviceId: null };

  entry.handleClick = (event) => {
    event.stopPropagation();
    onClick(entry);
  };

  bubble.addEventListener('click', entry.handleClick);

  entry.marker = new Marker({ element: bubble, anchor: 'bottom', offset: [0, -22] });

  return entry;
};

const FamilyInfoBubbles = ({ positions, onMarkerClick }) => {
  const devices = useSelector((state) => state.devices.items);

  const entriesRef = useRef(new Map());
  const clickHandlerRef = useRef(onMarkerClick);
  clickHandlerRef.current = onMarkerClick;

  useEffect(
    () => () => {
      entriesRef.current.forEach((entry) => {
        entry.bubble.removeEventListener('click', entry.handleClick);
        entry.marker.remove();
      });
      entriesRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    const visible = new Set();

    positions.forEach((position) => {
      const device = devices[position.deviceId];

      // Show a bubble for every person, even without a custom image.
      if (device?.category !== 'person') {
        return;
      }

      visible.add(position.deviceId);

      let entry = entriesRef.current.get(position.deviceId);

      if (!entry) {
        entry = createEntry((target) =>
          clickHandlerRef.current?.(target.positionId, target.deviceId),
        );
        entry.marker.setLngLat(toMapCoordinates(position.longitude, position.latitude)).addTo(map);
        entriesRef.current.set(position.deviceId, entry);
      } else {
        entry.marker.setLngLat(toMapCoordinates(position.longitude, position.latitude));
      }

      entry.positionId = position.id;
      entry.deviceId = position.deviceId;
      entry.fixTime = position.fixTime;

      if (entry.name.textContent !== device.name) {
        entry.name.textContent = device.name;
      }

      const age = getLocationAge(position.fixTime);

      if (entry.status.textContent !== age) {
        entry.status.textContent = age;
      }
    });

    entriesRef.current.forEach((entry, deviceId) => {
      if (!visible.has(deviceId)) {
        entry.bubble.removeEventListener('click', entry.handleClick);
        entry.marker.remove();
        entriesRef.current.delete(deviceId);
      }
    });
  }, [positions, devices]);

  // Keep the elapsed time honest while a device sits still and sends nothing.
  useEffect(() => {
    const interval = setInterval(() => {
      entriesRef.current.forEach((entry) => {
        entry.status.textContent = getLocationAge(entry.fixTime);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default FamilyInfoBubbles;
