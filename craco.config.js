const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add TsconfigPathsPlugin to resolve path aliases
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins || [];
      webpackConfig.resolve.plugins.push(new TsconfigPathsPlugin({
        configFile: './tsconfig.json',
      }));
      
      // Disable treating ESLint warnings as errors in production build
      if (process.env.NODE_ENV === 'production') {
        const eslintPlugin = webpackConfig.plugins.find(
          plugin => plugin.constructor.name === 'ESLintWebpackPlugin'
        );
        if (eslintPlugin) {
          eslintPlugin.options.failOnWarning = false;
          eslintPlugin.options.failOnError = false;
        }
      }
      
      return webpackConfig;
    },
  },
};

