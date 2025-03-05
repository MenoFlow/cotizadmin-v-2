import express, { query } from 'express';

import cors from 'cors';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// Obtenir le répertoire courant du fichier
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Exemple d'utilisation de __dirname
app.use(express.static(path.join(__dirname, 'dist')));

// Charge les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// app.use(express.static('dist')); // Dossier de build du frontend

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const pool = mysql.createPool(dbConfig);

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Route d'authentification
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = users[0];
    if (!user || user.password !== password) { // En production, utiliser bcrypt pour le hash
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Routes des membres
app.get('/api/members', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM members');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

function insertMember(memberId){
  const sql = `
    INSERT INTO contributions (memberId, month, year, paidAt, paiement) VALUES
      (?, 1, YEAR(NOW()), NOW(), false),
      (?, 2, YEAR(NOW()),NOW(), false),
      (?, 3, YEAR(NOW()), NOW(), false),
      (?, 4, YEAR(NOW()), NOW(), false),
      (?, 5, YEAR(NOW()), NOW(), false),
      (?, 6, YEAR(NOW()), NOW(), false),
      (?, 7, YEAR(NOW()), NOW(), false),
      (?, 8, YEAR(NOW()), NOW(), false),
      (?, 9, YEAR(NOW()), NOW(), false),
      (?, 10, YEAR(NOW()), NOW(), false),
      (?, 11, YEAR(NOW()), NOW(), false),
      (?, 12, YEAR(NOW()), NOW(), false)
  `
   pool.query(sql, [memberId,memberId,memberId,memberId,memberId,memberId,memberId,memberId,memberId,memberId,memberId,memberId,])
}

app.post('/api/members', authenticateToken, async (req, res) => {
  const { firstName, lastName, cin, phone, email, birthDate, facebookName, profession, height } = req.body;
  try {
    // Vérifier si un membre avec le même cin ou email existe déjà
    const [existingMember] = await pool.query(
      'SELECT * FROM members WHERE cin = ? OR email = ?',
      [cin, email]
    );
    if (existingMember.length > 0) {
      return res.status(400).json({ message: 'Le CIN ou l\'email existe déjà' });
    }
    // Insertion du nouveau membre
    const [result] = await pool.query(
      'INSERT IGNORE INTO members (firstName, lastName, cin, phone, email, birthDate, facebookName, profession, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [firstName, lastName, cin, phone, email, birthDate, facebookName, profession, height]
    );
    insertMember(result.insertId);
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.put('/api/members/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, cin, phone, email, birthDate, facebookName, profession, height } = req.body;
  try {
    // Vérifier si un membre avec le même cin ou email existe déjà, à l'exception du membre actuel
    const [existingMember] = await pool.query(
      'SELECT * FROM members WHERE (cin = ? OR email = ?) AND id != ?',
      [cin, email, id]
    );
    if (existingMember.length > 0) {
      return res.status(400).json({ message: 'Le CIN ou l\'email existe déjà' });
    }
    // Mise à jour du membre
    const [results, fields] = await pool.query(
      'UPDATE members SET firstName=?, lastName=?, cin=?, phone=?, email=?, birthDate=?, facebookName=?, profession=?, height=? WHERE id=?',
      [firstName, lastName, cin, phone, email, birthDate, facebookName, profession, height, id]
    );
    // Si aucune ligne n'a été affectée, cela signifie qu'aucun membre n'a été trouvé avec l'id spécifié
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Membre non trouvé' });
    }

    res.json({ id, ...req.body });

  } catch (error) {
    console.error('Erreur de la requête:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/members/count', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT COUNT(id) as counts FROM members
    `);
    const count = rows[0];
    res.json(count);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
})

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM members WHERE id = ?', [id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Routes des cotisations
app.get('/api/contributions', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.memberId, c.month, c.paiement, m.firstName, m.lastName 
      FROM contributions c

      JOIN members m ON c.memberId = m.id
      where c.year=YEAR(CURRENT_TIMESTAMP)
    `);
    // console.log(rows)
    const q1 = []
    const q2 = []
    const q3 = []
    const q4 = []
    let compteur = -1;
    let lastMemberId = 0;
    rows.map((row)=>{
      if (row.memberId !== lastMemberId && row.month <= 3){
        compteur+=1;
      }
      if(( row.month === 1 )){
        q1.push(
          {
            memberId: row.memberId,
            memberName: row.firstName+" "+row.lastName,
            payments: {
              janvier: row.paiement===1,
              fevrier: false,
              mars: false
            }
          }
        )
      }
      console.log(compteur)
      console.log(q1[compteur])
      if(( row.month === 2 )){
        q1[compteur].payments.fevrier = row.paiement===1;
      }
      if(( row.month === 3 )){
        q1[compteur].payments.mars = row.paiement===1;
      }
      lastMemberId = row.memberId;
    })
    //q2
    compteur = -1
    // debugger
    lastMemberId=0
    rows.map((row)=>{
      if (row.month > 3 && row.month <= 6){
        if (row.memberId !== lastMemberId){
          compteur+=1;
        }
        if(( row.month === 4 )){
          q2.push(
            {
              memberId: row.memberId,
              memberName: row.firstName+" "+row.lastName,
              payments: {
                avril: row.paiement===1,
                mai: false,
                juin: false
              }
            }
          )
        }
        if(( row.month === 5 )){
          q2[compteur].payments.mai = row.paiement===1;
        }
        if(( row.month === 6 )){
          q2[compteur].payments.juin = row.paiement===1;
        }
        lastMemberId = row.memberId;
      }

    })
    //q3
    compteur=-1
    lastMemberId=0
    rows.map((row)=>{
      if (row.month > 6 && row.month <= 9){
        if (row.memberId !== lastMemberId){
          compteur+=1;
        }
        if(( row.month === 7 )){
          q3.push(
            {
              memberId: row.memberId,
              memberName: row.firstName+" "+row.lastName,
              payments: {
                juillet: row.paiement===1,
                aout: false,
                septembre: false
              }
            }
          )
        }
        if(( row.month === 8 )){
          q3[compteur].payments.aout = row.paiement===1;
        }
        if(( row.month === 9 )){
          q3[compteur].payments.septembre = row.paiement===1;
        }
        lastMemberId = row.memberId;
      }
    })
    //q4
    compteur=-1
    lastMemberId=0
    rows.map((row)=>{
      if (row.month > 9){
        if (row.memberId !== lastMemberId){
          compteur+=1;
        }
        if(( row.month === 10 )){
          q4.push(
            {
              memberId: row.memberId,
              memberName: row.firstName+" "+row.lastName,
              payments: {
                octobre: row.paiement===1,
                novembre: false,
                decembre: false
              }
            }
          )
        }
        if(( row.month === 11 )){
          q4[compteur].payments.novembre = row.paiement===1;
        }
        if(( row.month === 12 )){
          q4[compteur].payments.decembre = row.paiement===1;
        }
        lastMemberId = row.memberId;
      }
    })
    let data = {
      q1: q1,
      q2: q2,
      q3: q3,
      q4: q4
    };
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/contributions/member/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM contributions WHERE memberId = ?`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/contributions', authenticateToken, async (req, res) => {
  const { memberId, month, year, amount, paidAt } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO contributions (memberId, month, year, amount, paidAt) VALUES (?, ?, ?, ?, ?)',
      [memberId, month, year, amount, paidAt]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.put('/api/contributions', authenticateToken, async (req, res) => {
  const { paiement, memberId, monthNumber } = req.body;
  try {
    await pool.query(
      'UPDATE contributions SET paidAt = NOW() , paiement = ? WHERE memberId = ? AND month = ?',
      [paiement, memberId, monthNumber]
    );
    res.json({});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.delete('/api/contributions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM contributions WHERE id = ?', [id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Routes des utilisateurs (admin seulement)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT  username, password, role FROM users');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role] // En production, hasher le mot de passe
    );
    res.status(201).json({ id: result.insertId, username, role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.delete('/api/users/:username', authenticateToken, async (req, res) => {
  const { username } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE username = ?', [username]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.put('/api/users', authenticateToken, async (req, res) => {
  const { username, role } = req.body;
  try {
    await pool.query('UPDATE users SET role = ? WHERE username = ?', [role, username]);
    res.json({ username, role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Recuperer la liste des logs
app.get('/api/loginlogs', authenticateToken, async(req, res) => {
  const sql = `
    SELECT * FROM userlog
  `
  try{
    const [rows] = await pool.query(sql);
    res.json(rows);
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Erreur lors de la recuperation du journal de Log : "+error})
  }
})

// Inserer un log d'un user
app.post('/api/loginlogs', authenticateToken, async(req, res) => {
  const { username, timestamp, success } = req.body;
  const sql = `
    INSERT INTO userlog (username, timestamp, success) VALUES (?, ?, ?)
  `
  try{
    await pool.query(sql, [username, timestamp, success]);
    res.json({message: "login log inserer avec succès"})
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Erreur lors de l'ajout du login Log"})
  }
})

// Route pour servir l'application React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
