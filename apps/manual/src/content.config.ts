// SPDX-License-Identifier: AGPL-3.0-only
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: z.object({
      diffdevil: z.object({
        key: z.string(), source: z.string(), sourceUrl: z.string(), sourceRef: z.string(),
        appliesTo: z.string(), availability: z.enum(['current','in-development']),
      }),
    }) }),
  }),
};
