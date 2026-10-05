
const jwt = require('jsonwebtoken');

const JWT_SECRET = '12345678';

const user = {
    firebaseId: 'itp3IDrZNuUKS6WsHVz861ANiVg1', // Example from DB query earlier (ConTech Admin)
    id: 12,
    email: 'contech.admin@alikohub.com',
    firstname: 'ConTech',
    lastname: 'Admin',
    globalRole: 'ADMIN',
    status: 'ACTIVE',
    alikowashRole: 'ADMIN',
    alikowashStatus: 'ACTIVE'
};

const payload = {
    uid: user.firebaseId,
    id: user.id,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    globalRole: user.globalRole,
    status: user.status,
    alikowashRole: user.alikowashRole,
    alikowashStatus: user.alikowashStatus
};

const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
const refreshToken = jwt.sign({ uid: user.firebaseId, id: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

console.log('Login successful for:', user.email);
console.log('--- Access Token ---');
console.log(accessToken);
console.log('--- Refresh Token ---');
console.log(refreshToken);
