import jwt from 'jsonwebtoken';

import dotenv from 'dotenv';
dotenv.config();

const payload = {
  userId: 1,   // Exemple d'ID utilisateur
  username: 'userTest', // Exemple de nom d'utilisateur
  role: 'user',  // Exemple de rôle
};

// Générer un token avec une expiration de 1h
const token = jwt.sign(payload, process.env.JWT_SECRET);

console.log('Token:', token);

