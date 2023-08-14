const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function clear() {
  process.stdout.write('\u001b[3J\u001b[2J\u001b[1J');
  console.clear();
}

function exec(cmd, args) {
  const proc = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true
  });
  if (proc.status) {
    process.exit(proc.status);
  }
}

function removeDir(dir) { 
  const srcDir = dir;

  if (!dir.startsWith('/')) { 
    dir = path.join(process.cwd(), dir);
  }

  if (!fs.existsSync(dir)){
    return
  }

  fs.rmSync(dir, { recursive: true, force: true })

  console.log('removed:')
  console.log(' ', srcDir)

}

function copyDir(from, to, removeExisting = true) { 
  const srcFrom = from;
  const srcTo = to;

  if (!from.startsWith('/')) { 
    from = path.join(process.cwd(), from);
  }

  if (!to.startsWith('/')) { 
    to = path.join(process.cwd(), to);
  }

  if (!fs.existsSync(from)) {
    throw new Error(`Invalid source: ${from}`);
  }

  if (fs.existsSync(to)){
    if (removeExisting) {
      removeDir(srcTo);
    }
  }

  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });

  console.log('copied:')
  console.log(' ', srcFrom)
  console.log(' ', srcTo)

}

module.exports = { clear, exec, copyDir, removeDir }