module.exports = {
  apps: [
    {
      name: 'rack-server',
      script: 'server/server.js',
      cwd: '/home/jackson/Github/rpi-RackController',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        RACK_CONFIG: '/home/jackson/Github/rpi-RackController/config.json',
      },
    },
    {
      name: 'rack-agent',
      script: 'agent.js',
      cwd: '/home/jackson/Github/rpi-RackController/agent',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
