import { useEffect } from 'react';
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

const FamilyInfoBubbles = ({ positions, onMarkerClick }) => {
  const devices = useSelector((state) => state.devices.items);

  useEffect(() => {
    const markers = [];

    positions.forEach((position) => {
      const device = devices[position.deviceId];

      if (device?.category !== 'person' || !device.attributes?.deviceImage) {
        return;
      }

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
      name.textContent = device.name;
      name.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        line-height: 19px;
      `;

      const status = document.createElement('div');
      status.textContent = getLocationAge(position.fixTime);
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

      const handleClick = (event) => {
        event.stopPropagation();
        onMarkerClick?.(position.id, position.deviceId);
      };

      bubble.addEventListener('click', handleClick);

      const marker = new Marker({
        element: bubble,
        anchor: 'bottom',
        offset: [0, -22],
      })
        .setLngLat(toMapCoordinates(position.longitude, position.latitude))
        .addTo(map);

      markers.push({ marker, bubble, handleClick, status, fixTime: position.fixTime });
    });

    const refreshStatuses = () => {
      markers.forEach(({ status, fixTime }) => {
        status.textContent = getLocationAge(fixTime);
      });
    };

    const interval = setInterval(refreshStatuses, 30000);

    return () => {
      clearInterval(interval);

      markers.forEach(({ marker, bubble, handleClick }) => {
        bubble.removeEventListener('click', handleClick);
        marker.remove();
      });
    };
  }, [positions, devices, onMarkerClick]);

  return null;
};

export default FamilyInfoBubbles;
