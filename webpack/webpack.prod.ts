import { EnvironmentPlugin } from 'webpack';

import { projectRoot } from './helpers';
import { commonExports } from './webpack.common';
const webpack = require("webpack");

module.exports = Object.assign({}, commonExports, {
  plugins: [
    ...commonExports.plugins,
    new EnvironmentPlugin({
      'process.env': {
        NODE_ENV: 'production',
        AOT: true,
      },
    }),
    new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ }) // ✅ Ignore `canvas` for browser compatibility

  ],
  resolve: {
    alias: {
      "canvas": false, // ✅ Prevent Webpack from bundling `canvas`
      "pdfjs-dist/build/pdf.worker.entry": require.resolve("pdfjs-dist/build/pdf.worker.min.js"), // ✅ Use the correct PDF worker
    }
  },
  mode: 'production',
  recordsOutputPath: projectRoot('webpack.records.json'),
  entry: projectRoot('./server.ts'),
  target: 'node',
});
