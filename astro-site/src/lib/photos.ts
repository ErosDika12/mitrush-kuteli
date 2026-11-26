import type { ImageMetadata } from 'astro';
import { photosData } from './data';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.jpg', { eager: true });
const staffFiles = import.meta.glob<{ default: ImageMetadata }>('../assets/staff/*.webp', { eager: true });

export const images: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(files)) {
  images[path.split('/').pop()!.replace(/\.jpg$/, '')] = mod.default;
}

for (const [path, mod] of Object.entries(staffFiles)) {
  images[path.split('/').pop()!.replace(/.webp$/, '')] = mod.default;
}

export interface Photo { id: string; alt: string; caption: string; album: string; focus?: string; ratio?: string; fit?: 'contain' | 'cover'; src: ImageMetadata }

export const photos: Photo[] = photosData.photos.map((p) => {
  const src = images[p.id];
  if (!src) throw new Error(`photo ${p.id} is listed in photos.json but missing from src/assets/photos`);
  return { ...p, src };
});
export const photoById = new Map(photos.map((p) => [p.id, p]));
export const albums = photosData.albums;
