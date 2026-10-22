// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
// Public loading-boundary fixture, not the private file-history implementation.
import Region from './Region.astro';
import FileRegion from './FileRegion.astro';
export default {
  service: () => {
    let populations = 0;
    return {
      async files({ merged }) {
        populations++;
        const files = new Map();
        for (const row of merged) for (const file of row.final?.report.files ?? []) {
          files.set(`${row.repositoryId}:${file.path}`, { repositoryId: row.repositoryId, path: file.path, contributions: [] });
        }
        return { files: [...files.values()], sizeObservation: [] };
      },
      async file({ query, files }) {
        const file = files.find(file => file.path === query.path);
        return file ? { file, populations } : undefined;
      },
      async pr() { return {}; }
    };
  },
  projection: { async mapFiles(files, viewer, runtime) {
    return Promise.all(files.map(async file => ({ ...file, locator: await runtime.locator.of(file.repositoryId, file.path) })));
  } },
  pages: { overview: { Cloud: Region, load: async () => null }, history: { Panels: Region }, files: { Body: Region }, file: { Body: FileRegion }, pr: { Context: Region, fileHrefs: async () => new Map() } }
};
