module.exports = {
  apps: [
    {
      name: "enterprise-whatsapp-crm",
      script: "./dist/server.cjs",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        ADMIN_ID: "admin",
        ADMIN_PASSWORD: "12345"
      }
    }
  ]
};
