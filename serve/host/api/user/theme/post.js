const fs = require('fs');
const path = require('path');

module.exports = function(req, res, next) {

  const filepath = path.join(__dirname, '..', 'identify.json');
  if (!req.body?.theme) { 
    res.sendStatus(400);
    res.end();
    return;
  }

  const dat = JSON.parse(fs.readFileSync(filepath, { encoding: 'utf-8' }));
  dat.preference.theme = req.body.theme;
  
  fs.writeFileSync(filepath, JSON.stringify(dat, null, 2), { encoding: 'utf-8' });

  res.setHeader('Content-Type', 'application/json');
  res.send({ ok: true });
  res.end();

}

