import './theme/index.css';
import { partials } from './content.ts';
import { manifest } from './deck.ts';
import { boot } from './engine/boot.ts';

const app = document.getElementById('app');
if (app) boot({ app, manifest, partials, defaultRole: 'deck' });
