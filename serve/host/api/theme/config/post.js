const path = require('path');
const fs = require('fs');

module.exports = function(req, res, next, params){ 
  const themeId = params?.themeId;
  if (!themeId) { 
    console.error('invalid-theme: missing-theme-id');
    res.sendStatus(404);
  }

  const config = req.body?.config || {};
  const tokens = req.body?.tokens || {};
  const css = req.body?.css || '';
  
  save(themeId, `design-tokens.config.json`, config);
  save(themeId, `design-tokens.json`, tokens);
  saveStyleSheet(css);

  console.log('theme-edit', themeId)
  res.setHeader('Content-Type', 'application/json');
  res.send({ ok: true });

}

function save(themeId, filename, data) {

  const dir = `../../../assets/theme/${themeId}`;
  const file = path.join(__dirname, dir, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { encoding: 'utf-8' });

}

function saveStyleSheet(data) { 
  const dir = `../../../assets/theme/styles.css`;
  const file = path.join(__dirname, dir);
  fs.writeFileSync(file, data, { encoding: 'utf-8' });

}