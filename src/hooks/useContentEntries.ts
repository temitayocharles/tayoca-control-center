import { useQuery } from '@tanstack/react-query';
import { cmsApi } from '../services/cms';
import { classifyContent, friendlyContentName } from '../lib/cmsDocument';

export interface ContentPaletteEntry {
  path: string;
  name: string;
  kind: string;
}

/**
 * Best-effort list of canonical site content for the command palette.
 * Returns an empty array when the CMS is unreachable so the palette still
 * works even before the control gateway is configured.
 */
export const useContentEntries = () => {
  return useQuery({
    queryKey: ['content-entries'],
    queryFn: async (): Promise<ContentPaletteEntry[]> => {
      const entries = await cmsApi.list();
      return entries
        .filter((entry) => entry.path !== 'public/data/site-settings.json')
        .slice(0, 20)
        .map((entry) => ({
          path: entry.path,
          name: friendlyContentName(entry.path),
          kind: classifyContent(entry.path),
        }));
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
