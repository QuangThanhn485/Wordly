const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add TsconfigPathsPlugin to resolve path aliases
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins || [];
      webpackConfig.resolve.plugins.push(new TsconfigPathsPlugin({
        configFile: './tsconfig.json',
      }));
      
      return webpackConfig;
    },
  },
};

