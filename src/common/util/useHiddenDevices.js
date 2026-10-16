import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sessionActions } from '../../store';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from './fetchOrThrow';

// Kept on the user account rather than in local storage so hiding someone on
// the laptop also hides them on the phone. Stored as a comma separated list of
// device ids, which is how Traccar attributes are usually shaped.
const ATTRIBUTE = 'familyHiddenDevices';

const parseIds = (value) =>
  new Set(
    String(value ?? '')
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((id) => Number.isInteger(id) && id > 0),
  );

const useHiddenDevices = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);
  const stored = useSelector((state) => state.session.user?.attributes?.[ATTRIBUTE] ?? '');

  // Memoised on the raw string so the set keeps its identity between renders.
  const hiddenIds = useMemo(() => parseIds(stored), [stored]);

  const toggleHidden = useCatchCallback(
    async (deviceId) => {
      const next = new Set(hiddenIds);

      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }

      const attributes = { ...user.attributes, [ATTRIBUTE]: Array.from(next).join(',') };

      const response = await fetchOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, attributes }),
      });

      dispatch(sessionActions.updateUser(await response.json()));
    },
    [user, hiddenIds, dispatch],
  );

  return { hiddenIds, toggleHidden };
};

export default useHiddenDevices;
