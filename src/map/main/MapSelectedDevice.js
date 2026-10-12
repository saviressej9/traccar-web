import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import dimensions from '../../common/theme/dimensions';
import { map } from '../core/MapView';
import { usePrevious } from '../../reactHelper';
import { useAttributePreference } from '../../common/util/preferences';
import { toMapCoordinates } from '../core/mapUtil';

const MapSelectedDevice = () => {
  const currentTime = useSelector((state) => state.devices.selectTime);
  const currentId = useSelector((state) => state.devices.selectedId);
  const cardOpen = useSelector((state) => state.devices.cardOpen);
  const previousTime = usePrevious(currentTime);
  const previousId = usePrevious(currentId);

  const selectZoom = useAttributePreference('web.selectZoom', 10);
  const mapFollow = useAttributePreference('mapFollow', false);

  const position = useSelector((state) => state.session.positions[currentId]);

  const previousPosition = usePrevious(position);

  useEffect(() => {
    const positionChanged =
      position &&
      (!previousPosition ||
        position.latitude !== previousPosition.latitude ||
        position.longitude !== previousPosition.longitude);

    if (
      (currentId !== previousId ||
        currentTime !== previousTime ||
        (mapFollow && positionChanged)) &&
      position
    ) {
      map.easeTo({
        center: toMapCoordinates(position.longitude, position.latitude),
        zoom: Math.max(map.getZoom(), selectZoom),
        // Leave room for the status card only when it is actually open.
        offset: cardOpen ? [0, -dimensions.popupMapOffset / 2] : [0, 0],
      });
    }
  }, [
    currentId,
    previousId,
    currentTime,
    previousTime,
    cardOpen,
    mapFollow,
    position,
    previousPosition,
    selectZoom,
  ]);

  return null;
};

export default MapSelectedDevice;
