/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

module.exports = {
  apps: [
    {
      //  General
      name: 'Rebustarv3',
      script: 'bin/www.js',
      // args: '--experimental-specifier-resolution=node',

      //   Advanced features
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '450M',
      instance_var: 'INSTANCE_ID',
      watch: true,
      // ignore_watch: ['[\/\\]\./', 'node_modules'],
      watch: ['./config', './modules'],
      ignore_watch: ['[/\\]./', 'node_modules', 'logs', '*.log', '.git', 'public/assets', 'temp/'],
      watch_options: {
        followSymlinks: false
      },
      source_map_support: true,

      //   Logs option
      out_file: './logs/app-out.log',
      error_file: './logs/app-error.log',
      log_file: './logs/app-log.log'
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      // pid_file: './app-process.pid',
      // merge_logs: true,
      // log_type: 'json',
    }
  ]
}
