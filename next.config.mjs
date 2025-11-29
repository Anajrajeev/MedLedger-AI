/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support for Cardano serialization library
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Ignore wbindgen placeholder for lucid-cardano
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '__wbindgen_placeholder__': false,
    };

    // Fix for Cardano serialization lib in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Fix for lucid-cardano WASM files
    config.resolve.alias = {
      ...config.resolve.alias,
      '__wbindgen_placeholder__': false,
    };

    // Suppress the async/await warning for WebAssembly
    config.ignoreWarnings = [
      { module: /node_modules\/@emurgo\/cardano-serialization-lib-browser/ },
      { module: /node_modules\/lucid-cardano/ },
    ];

    return config;
  },
};

export default nextConfig;

