// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import type { APIRoute } from 'astro';
import { handleManageExport } from '../../lib/manage/export.mjs';

export const GET: APIRoute = handleManageExport;
