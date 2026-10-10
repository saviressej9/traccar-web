const avatarCache = new Map();
const pendingAvatars = new Map();
const registeredAvatars = new Map();

const getAvatarUrl = (device) =>
  `/api/media/${encodeURIComponent(device.uniqueId)}/${encodeURIComponent(device.attributes.deviceImage)}`;

const getAvatarKey = (device) =>
  `family-avatar-${device.id}-${encodeURIComponent(device.attributes.deviceImage)}`;

export const createAvatarMarker = async (imageUrl) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = imageUrl;
  await image.decode();

  const size = 128;
  const center = size / 2;
  const radius = 48;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create avatar canvas');
  }

  // Circular white background and subtle shadow.
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(center, center, radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Circular image crop.
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.clip();

  const cropSize = Math.min(image.width, image.height);
  const cropX = (image.width - cropSize) / 2;
  const cropY = (image.height - cropSize) / 2;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropSize,
    cropSize,
    center - radius,
    center - radius,
    radius * 2,
    radius * 2,
  );

  ctx.restore();

  // Find My-style white outline.
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
};

export const getAvatarMarkerKey = (device) => {
  if (
    device?.category !== 'person' ||
    !device.attributes?.deviceImage
  ) {
    return null;
  }

  return getAvatarKey(device);
};

export const registerAvatarMarker = async (map, device) => {
  const imageKey = getAvatarMarkerKey(device);

  if (!imageKey) {
    return null;
  }

  const imageUrl = getAvatarUrl(device);

  try {
    let avatar = avatarCache.get(imageUrl);

    if (!avatar) {
      if (!pendingAvatars.has(imageUrl)) {
        const promise = createAvatarMarker(imageUrl);
        pendingAvatars.set(imageUrl, promise);
      }

      avatar = await pendingAvatars.get(imageUrl);
      avatarCache.set(imageUrl, avatar);
    }

    if (!map.hasImage(imageKey)) {
      map.addImage(imageKey, avatar, {
        pixelRatio: 2,
      });
    }

    registeredAvatars.set(device.id, imageKey);

    return imageKey;
  } catch (error) {
    console.warn(
      'Unable to load family avatar',
      device.id,
      error,
    );

    return null;
  } finally {
    pendingAvatars.delete(imageUrl);
  }
};

// Register all current avatars and restore them after style changes.
export const restoreAvatarMarkers = async (map, devices) => {
  const activeKeys = new Set();
  const activeUrls = new Set();

  const eligibleDevices = Object.values(devices).filter(
    (device) =>
      device.category === 'person' &&
      device.attributes?.deviceImage,
  );

  eligibleDevices.forEach((device) => {
    activeKeys.add(getAvatarKey(device));
    activeUrls.add(getAvatarUrl(device));
  });

  await Promise.all(
    eligibleDevices.map((device) =>
      registerAvatarMarker(map, device),
    ),
  );

  // Remove outdated marker registrations.
  registeredAvatars.forEach((key, deviceId) => {
    if (!activeKeys.has(key)) {
      if (map.hasImage(key)) {
        map.removeImage(key);
      }
      registeredAvatars.delete(deviceId);
    }
  });

  // Remove cached images no longer referenced by any device.
  avatarCache.forEach((value, url) => {
    if (!activeUrls.has(url)) {
      avatarCache.delete(url);
    }
  });
};
