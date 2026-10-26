import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config';

// The generator pads the maskable and Apple icons and fills that padding with
// white by default. Android crops a maskable icon to a circle, so white
// padding shows up as pale corners around the tile. Padding it with the theme
// indigo instead keeps the icon looking like one solid shape whatever mask a
// launcher applies.
const background = '#1a237e';

export default defineConfig({
  preset: {
    ...minimalPreset,
    maskable: { ...minimalPreset.maskable, resizeOptions: { background } },
    apple: { ...minimalPreset.apple, resizeOptions: { background } },
  },
  images: ['public/logo.svg'],
});
