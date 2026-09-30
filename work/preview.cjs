// Legacy entry point: launch the local application server.
require('node:child_process').spawnSync(process.execPath,[require('node:path').join(__dirname,'../server.cjs')],{stdio:'inherit'});
