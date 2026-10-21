import { defineLiveCollection } from 'astro:content';
import { emdashLoader } from 'emdash/runtime';

// Registers EmDash as an Astro Live Content Collection so getEmDashCollection()
// and getEmDashEntry() can read the CMS database at request time.
export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};