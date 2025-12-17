/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };

    if (isServer && !global.__ENV_LOGGED__) {
      global.__ENV_LOGGED__ = true;

      console.log('\n' + '='.repeat(80));
      console.log('🚀 BUILD-TIME ENVIRONMENT VARIABLES (SAFE TO EXPOSE)');
      console.log('='.repeat(80));

      console.log('\n📋 Smart Contracts:');
      console.log('   CONTRACT_ADDRESS:', process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '❌ NOT SET');
      console.log('   TOKEN_ADDRESS:   ', process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '❌ NOT SET');

      console.log('\n🌐 Network Configuration:');
      console.log('   RPC_URL:         ', process.env.NEXT_PUBLIC_RPC_URL || '❌ NOT SET');
      console.log('   CHAIN_ID:        ', process.env.NEXT_PUBLIC_CHAIN_ID || '❌ NOT SET');
      console.log('   NETWORK_NAME:    ', process.env.NEXT_PUBLIC_NETWORK_NAME || '❌ NOT SET');

      console.log('\n🔗 API Configuration:');
      console.log('   API_URL:         ', process.env.NEXT_PUBLIC_API_URL || '❌ NOT SET');

      console.log('\n' + '='.repeat(80));
      console.log('⚠️  NOTE: Only NEXT_PUBLIC_* variables are shown');
      console.log('🔒 Private variables are NOT logged');
      console.log('='.repeat(80) + '\n');
    }

    return config;
  },
};

module.exports = nextConfig;
