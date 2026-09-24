// SPDX-License-Identifier: AGPL-3.0-only
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
export const collections = {
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: z.object({
      diffdevil: z.object({
        key: z.string(), source: z.string(), sourceUrl: z.string(), sourceRef: z.string(),
        packageVersion: z.string(), availability: z.enum(['current','in-development']),
      }),
    }) }),
  }),
};
