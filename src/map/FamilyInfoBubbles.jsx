
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Marker } from 'maplibre-gl';
import { map } from './core/MapView';
import { toMapCoordinates } from './core/mapUtil';

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
      status.textContent =
        device.status === 'online' ? 'Location available' : 'Last known location';
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
        offset: [0, -45],
      })
        .setLngLat(toMapCoordinates(position.longitude, position.latitude))
        .addTo(map);

      markers.push({ marker, bubble, handleClick });
    });

    return () => {
      markers.forEach(({ marker, bubble, handleClick }) => {
        bubble.removeEventListener('click', handleClick);
        marker.remove();
      });
    };
  }, [positions, devices, onMarkerClick]);

  return null;
};

export default FamilyInfoBubbles;
