import { defineConfig } from 'umi';
import { join } from 'path';
import defaultSettings from './defaultSettings';
import proxy from './proxy';
import routes from './routes';
const { REACT_APP_ENV } = process.env;

export default defineConfig({
  antd: {},
  plugins: [
    '@umijs/plugins/dist/antd',
    '@umijs/plugins/dist/initial-state',
    '@umijs/plugins/dist/model',
    '@umijs/plugins/dist/request',
    '@umijs/plugins/dist/access',
    '@umijs/plugins/dist/layout',
  ],
  model: {},
  initialState: {},
  request: {},
  access: {},
  layout: {
    ...defaultSettings,
  },
  routes,
  proxy: proxy[REACT_APP_ENV || 'dev'],
  mfsu: {},
});
