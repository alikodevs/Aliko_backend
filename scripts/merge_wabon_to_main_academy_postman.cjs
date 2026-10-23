const fs = require('fs');
const path = require('path');

const mainAcademyPath = path.join(__dirname, '..', 'apps', 'academy-service', 'AlikoHub-Academy-Backend.postman_collection.json');
const wabonPath = path.join(__dirname, '..', 'postman', 'AlikoHub_Academy_WABON_Compliance.postman_collection.json');

const mainCollection = JSON.parse(fs.readFileSync(mainAcademyPath, 'utf-8'));
const wabonCollection = JSON.parse(fs.readFileSync(wabonPath, 'utf-8'));

// Filter out any existing WABON folders if run repeatedly
const existingNames = new Set(wabonCollection.item.map((i) => i.name));
mainCollection.item = mainCollection.item.filter((i) => !existingNames.has(i.name));

// Append WABON items
mainCollection.item.push(...wabonCollection.item);

fs.writeFileSync(mainAcademyPath, JSON.stringify(mainCollection, null, 2), 'utf-8');
console.log(`✔ Successfully merged 16 WABON compliance folders into: ${mainAcademyPath}`);
