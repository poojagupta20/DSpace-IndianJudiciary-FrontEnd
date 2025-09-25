import { join } from 'path';

import { buildAppConfig } from '../src/config/config.server';
import { commonExports } from './webpack.common';

const CompressionPlugin = require('compression-webpack-plugin');
const zlib = require('zlib');
const webpack = require("webpack");


module.exports = Object.assign({}, commonExports, {
  target: 'web',
  resolve: {
    alias: {
      "canvas": false, // Ignore canvas for the browser
      "pdfjs-dist/build/pdf.worker.entry": require.resolve("pdfjs-dist/build/pdf.worker.min.js")
    }
  },
  plugins: [
    ...commonExports.plugins,
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg|json)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg|json)$/,
      compressionOptions: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        },
      },
      threshold: 10240,
      minRatio: 0.8,
    }),
    new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ }) 
  ],
  devServer: {
    setupMiddlewares(middlewares, server) {
      buildAppConfig(join(process.cwd(), 'src/assets/config.json'));
      return middlewares;
    }
  },
  watchOptions: {
    // Ignore directories that should not be watched for recompiling angular
    ignored: [
      '**/node_modules', '**/_build', '**/.git', '**/docker',
      '**/.angular', '**/.idea', '**/.vscode', '**/.history', '**/.vsix'
    ]
  },
});
