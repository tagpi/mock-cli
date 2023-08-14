const path = require('path');
const fs = require('fs');


module.exports = function(req, res, next) { 

  const radarId = req.body?.radarId || '';
  const search = req.body?.search || '';
  const itemsPerPage = req.body?.itemsPerPage || 10;
  const currentPage = req.body?.page || 1;
  const filter = req.body?.filter;
  const result = query(radarId, search, itemsPerPage, currentPage, filter);

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(result, null, 2))

}

function query(radarId, search, itemsPerPage, currentPage, filter) { 

  const dir = `../${radarId}/data.json`;
  const file = path.join(__dirname, dir);
  const data = fs.readFileSync(file, { encoding: 'utf-8' });
  const json = JSON.parse(data);

  let list = json.filter(item => isValid(item, search, filter?.stages, filter?.groups));

  const total = list.length;
  const start = itemsPerPage * (currentPage - 1);

  list.sort((a, b) => { 
    const aRef = a.name || a.id || '';
    const bRef = b.name || b.id || '';
    if (aRef < bRef) { return -1 }
    if (bRef < aRef) { return  1 }
    return 0;
  });
   
  list = list.splice(start, itemsPerPage);

  return {
    records: list,
    pages: Math.ceil(total / itemsPerPage)
  };

}

function isValid(record, search, stages, groups) { 

  if (search) {
    let isSearchStringValid = false
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase().indexOf(search) > -1) { 
        isSearchStringValid = true;
        break;
      }
      if (value.toLowerCase().indexOf(search) > -1) {
        isSearchStringValid = true;
        break;
      }
    }
    if (!isSearchStringValid) { 
      return false;
    }
  }

  stages = stages || [];
  stages = stages.filter(item => !!item);
  if (stages?.length) {
    if (stages.indexOf(record.stage) === -1) {
      return false;
    }
  }

  groups = groups || [];
  groups = groups.filter(item => !!item);
  if (groups?.length) {
    if (groups.indexOf(record.group) === -1) {
      return false;
    }
  }

  return true;

}
