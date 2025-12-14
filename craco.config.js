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
  devServer: (devServerConfig) => {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
    const beforeSetup = devServerConfig.onBeforeSetupMiddleware;
    const afterSetup = devServerConfig.onAfterSetupMiddleware;

    if (beforeSetup || afterSetup) {
      devServerConfig.setupMiddlewares = (middlewares, devServer) => {
        if (typeof beforeSetup === 'function') {
          beforeSetup(devServer);
        }

        if (typeof originalSetupMiddlewares === 'function') {
          const maybeMiddlewares = originalSetupMiddlewares(middlewares, devServer);
          if (Array.isArray(maybeMiddlewares)) {
            middlewares = maybeMiddlewares;
          }
        }

        if (typeof afterSetup === 'function') {
          afterSetup(devServer);
        }

        return middlewares;
      };

      delete devServerConfig.onBeforeSetupMiddleware;
      delete devServerConfig.onAfterSetupMiddleware;
    }

    return devServerConfig;
  },
};
