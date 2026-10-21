// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
// Public loading-boundary fixture, not the private file-history implementation.
import Region from './Region.astro';
export default { pages: { overview: { Cloud: Region, load: async () => null }, history: { Panels: Region }, files: { Body: Region }, file: { Body: Region }, pr: { Context: Region, fileHrefs: async () => new Map() } } };
