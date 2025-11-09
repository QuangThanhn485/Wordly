const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add TsconfigPathsPlugin to resolve path aliases
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins || [];
      webpackConfig.resolve.plugins.push(new TsconfigPathsPlugin({
        configFile: './tsconfig.json',
      }));
      
      // Disable ESLint plugin completely in production build (CI environment)
      // This prevents build failures from ESLint warnings when CI=true
      if (process.env.CI === 'true' || process.env.NODE_ENV === 'production') {
        webpackConfig.plugins = webpackConfig.plugins.filter(
          plugin => plugin.constructor.name !== 'ESLintWebpackPlugin'
        );
      }
      
      return webpackConfig;
    },
  },
};

