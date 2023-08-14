const path = require('path');
const fs = require('fs');

module.exports = function(req, res, next, params){ 

  const file = path.join(__dirname, '../../../assets/theme', params.themeId, `design-tokens.config.json`);
  if (!fs.existsSync(file)) {
    res.sendStatus(400);
    res.end();
    return;
  }

  res.sendFile(file);

}
