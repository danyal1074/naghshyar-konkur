import { USE_MOCK } from '../config';
import * as mock from './mock';
import * as http from './http';

// Every screen imports this one object. Flip USE_MOCK in src/config.js to switch to the real backend.
const api = USE_MOCK ? mock : http;
export default api;
