
const avatarCache = new Map();
const pendingAvatars = new Map();

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

  // Draw circular background with a subtle shadow.
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';

  ctx.beginPath();
  ctx.arc(center, center, radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Crop the uploaded image into a circle.
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

  // Add the white Find My-style border.
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
};

export const registerAvatarMarker = async (map, device) => {
  // Only Person devices with uploaded images use avatars.
  if (
    device.category !== 'person' ||
    !device.attributes?.deviceImage
  ) {
    return null;
  }

  const imageKey = `family-avatar-${device.id}`;

  const imageUrl =
    `/api/media/${encodeURIComponent(device.uniqueId)}/` +
    encodeURIComponent(device.attributes.deviceImage);

  try {
    let avatar = avatarCache.get(imageUrl);

    if (!avatar) {
      if (!pendingAvatars.has(imageUrl)) {
        pendingAvatars.set(
          imageUrl,
          createAvatarMarker(imageUrl),
        );
      }

      avatar = await pendingAvatars.get(imageUrl);
      avatarCache.set(imageUrl, avatar);
      pendingAvatars.delete(imageUrl);
    }

    // Register the image with MapLibre if necessary.
    if (!map.hasImage(imageKey)) {
      map.addImage(imageKey, avatar, {
        pixelRatio: 2,
      });
    }

    return imageKey;
  } catch (error) {
    pendingAvatars.delete(imageUrl);

    console.warn(
      'Unable to load family avatar',
      device.id,
      error,
    );

    return null;
  }
};

// Restore avatar images after the map style changes.
export const restoreAvatarMarkers = (map, devices) =>
  Promise.all(
    Object.values(devices)
      .filter(
        (device) =>
          device.category === 'person' &&
          device.attributes?.deviceImage,
      )
      .map((device) => registerAvatarMarker(map, device)),
  );
