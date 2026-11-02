import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',
 testMatch:['v062Diagnostic.spec.ts','v062SpriteSharpness.spec.ts','v071RockPolish.spec.ts'],
 timeout:45_000,fullyParallel:false,retries:0,
 use:{baseURL:'http://127.0.0.1:5197',trace:'retain-on-failure',screenshot:'only-on-failure',viewport:{width:1663,height:924}},
 webServer:{command:'pnpm exec vite preview --host 127.0.0.1 --port 5197 --strictPort',url:'http://127.0.0.1:5197',reuseExistingServer:false,timeout:60_000},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}]
});