import { useCallback, useEffect, useReducer, useRef } from 'react';

// Glide markers between consecutive fixes instead of letting them teleport.
//
// The client reports on distance travelled, so the gap between fixes shrinks as
// a device speeds up. Tween durations follow the observed gap, which keeps fast
// driving close to continuous without making a walk look frantic.
const MIN_DURATION = 300;
const MAX_DURATION = 2000;

// A jump this large is the client waking out of stationary mode rather than
// someone travelling, so it snaps. Gliding would draw a straight line through
// everything between the two fixes and imply a route that never happened.
const MAX_GLIDE_METERS = 500;

const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const radius = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(a)));
};

const useAnimatedPositions = (positions) => {
  const renderedRef = useRef(new Map());
  const tweensRef = useRef(new Map());
  const lastUpdateRef = useRef(new Map());
  const loopRef = useRef(null);
  // Repaints the markers from the refs above without copying coordinates into state.
  const [, repaint] = useReducer((value) => value + 1, 0);

  const ensureLoop = useCallback(() => {
    if (loopRef.current !== null) {
      return;
    }

    const step = () => {
      const now = performance.now();

      tweensRef.current.forEach((tween, deviceId) => {
        const progress = Math.min(1, (now - tween.start) / tween.duration);
        renderedRef.current.set(deviceId, {
          // Linear, so a device holds a steady speed across each leg. Easing
          // would make it surge and brake between every pair of fixes.
          latitude: tween.fromLat + (tween.toLat - tween.fromLat) * progress,
          longitude: tween.fromLon + (tween.toLon - tween.fromLon) * progress,
        });

        if (progress >= 1) {
          tweensRef.current.delete(deviceId);
        }
      });

      repaint();

      loopRef.current = tweensRef.current.size ? requestAnimationFrame(step) : null;
    };

    loopRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(
    () => () => {
      if (loopRef.current !== null) {
        cancelAnimationFrame(loopRef.current);
        loopRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const now = performance.now();

    positions.forEach((position) => {
      const { deviceId, latitude, longitude } = position;
      const current = renderedRef.current.get(deviceId);

      // First sighting of a device: place it, never animate from nowhere.
      if (!current) {
        renderedRef.current.set(deviceId, { latitude, longitude });
        lastUpdateRef.current.set(deviceId, now);
        return;
      }

      const tween = tweensRef.current.get(deviceId);
      const targetLat = tween ? tween.toLat : current.latitude;
      const targetLon = tween ? tween.toLon : current.longitude;

      if (targetLat === latitude && targetLon === longitude) {
        return;
      }

      const previousAt = lastUpdateRef.current.get(deviceId) ?? now;
      lastUpdateRef.current.set(deviceId, now);

      if (
        distanceMeters(current.latitude, current.longitude, latitude, longitude) > MAX_GLIDE_METERS
      ) {
        tweensRef.current.delete(deviceId);
        renderedRef.current.set(deviceId, { latitude, longitude });
        return;
      }

      tweensRef.current.set(deviceId, {
        fromLat: current.latitude,
        fromLon: current.longitude,
        toLat: latitude,
        toLon: longitude,
        start: now,
        duration: Math.min(MAX_DURATION, Math.max(MIN_DURATION, now - previousAt)),
      });
    });

    const present = new Set(positions.map((position) => position.deviceId));
    [renderedRef, tweensRef, lastUpdateRef].forEach((store) => {
      Array.from(store.current.keys()).forEach((deviceId) => {
        if (!present.has(deviceId)) {
          store.current.delete(deviceId);
        }
      });
    });

    if (tweensRef.current.size) {
      ensureLoop();
    }
  }, [positions, ensureLoop]);

  return positions.map((position) => {
    const current = renderedRef.current.get(position.deviceId);

    if (
      !current ||
      (current.latitude === position.latitude && current.longitude === position.longitude)
    ) {
      return position;
    }

    return { ...position, latitude: current.latitude, longitude: current.longitude };
  });
};

export default useAnimatedPositions;
