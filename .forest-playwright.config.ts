import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,outputDir:'test-results/forest-final',workers:2,use:{...base.use,baseURL:'http://127.0.0.1:5199'},webServer:{command:'"C:\\Users\\Scraxis\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe" node_modules/vite/bin/vite.js --config .forest-vite.config.ts --host 127.0.0.1 --port 5199 --strictPort',url:'http://127.0.0.1:5199',reuseExistingServer:false,timeout:30000}});
