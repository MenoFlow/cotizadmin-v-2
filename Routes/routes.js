import express from "express";
import con from "../utils/db.js"; // Assurez-vous que le chemin est correct
import bcrypt from 'bcrypt';
import multer from 'multer';
import { writeFile } from 'fs/promises';

// Configuration de multer pour la gestion des fichiers (upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Répertoire où les fichiers seront stockés
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname); // Nom unique pour chaque fichier
  }
});
const upload = multer({ storage: storage });

const router = express.Router();

// Route de test
router.get('/test', (req, res) => {
  res.json({ message: 'Ceci est un test de l\'API!' });
});

// Route pour créer un nouvel utilisateur (register)
router.post('/register', async (req, res) => {
  const { username, password, passwordSecond, telephone, privilege } = req.body;
  console.log( req.body)

  try {
      // Vérifier si l'utilisateur existe déjà
      const queryCheckUser = 'SELECT * FROM users WHERE username = ?';
      const [existingUser] = await con.promise().query(queryCheckUser, [username]);

      if (existingUser.length > 0) {
          return res.status(409).json({ message: 'L\'utilisateur existe déjà.' });
      }
      // Vérifier si le telephone existe existe ou pas
      const queryCheckPhone = 'SELECT * FROM membres WHERE telephone = ?';
      const [existingPhone] = await con.promise().query(queryCheckPhone, [telephone]);

      if (existingPhone.length === 0) {
          return res.status(409).json({ message: 'Le numero de telephone n\'appartient à  aucun membre.' });
      }
      // Générer un hash pour le mot de passe
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Requête pour insérer un nouvel utilisateur dans la base de données
      const queryInsertUser = 'INSERT INTO users (username, password, telephone, privilege) VALUES (?, ?, ?, ?)';
      await con.promise().query(queryInsertUser, [username, hashedPassword, telephone, privilege]);

      return res.status(201).json({ message: 'Utilisateur créé avec succès !' });

  } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur :', error);
      return res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

// Route de connexion (login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
      // Requête pour récupérer l'utilisateur par nom d'utilisateur
      const query = 'SELECT * FROM users WHERE username = ?';
      const [rows] = await con.promise().query(query, [username]);

      // Vérifie si l'utilisateur existe 
      if (rows.length > 0) {
          const user = rows[0];

          // Vérifie le mot de passe en comparant le hachage avec le mot de passe saisi
          const match = await bcrypt.compare(password, user.password); // Utiliser bcrypt pour comparer

          if (match) {
            req.session.username = username;
              return res.status(200).json({ message: 'Connexion réussie !' });
          } else {
              return res.status(401).json({ message: 'Nom d\'utilisateur ou mot de passe incorrect.' });
          }
      } else {
          return res.status(401).json({ message: 'Nom d\'utilisateur ou mot de passe incorrect.' });
      }
  } catch (error) {
      console.error('Erreur lors de la connexion à la base de données :', error);
      return res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

// Route pour ajouter un nouveau membre
router.post('/membre', upload.single('photo'), (req, res) => {
  const { nom, prenoms, surnom, date_naissance, situation, enfants, profession, taille, pointure, adresse, telephone, facebook, whatsapp } = req.body;
  const photo = req.file ? req.file.filename : null; // Récupère le nom du fichier téléchargé

  const sql = `INSERT INTO membres (nom, prenoms, surnom, date_naissance, situation, enfants, profession, taille, pointure, adresse, telephone, facebook, whatsapp, photo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [nom, prenoms, surnom, date_naissance, situation, enfants, profession, taille, pointure, adresse, telephone, facebook, whatsapp, photo];

  con.query(sql, values, (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'insertion:', err);
          return res.status(500).json({ message: 'Erreur serveur' });
      }
      res.status(201).json({ message: 'Membre ajouté avec succès', membreId: result.insertId });
  });
});

// Route pour récupérer tous les membres
router.get('/membres', (req, res) => {
  const sql = 'SELECT * FROM membres'; // Votre requête SQL pour récupérer tous les membres

  con.query(sql, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des membres:', err);
          return res.status(500).json({ message: 'Erreur serveur' });
      }
      res.status(200).json(results); // Renvoie les résultats sous forme de JSON
  });
});

// Route pour récupérer un membre par son ID
router.get('/membre/:id', (req, res) => {
  const membreId = req.params.id;
  const sql = 'SELECT * FROM membres WHERE telephone = ?'; // Remplacez "id" par le nom de votre clé primaire

  con.query(sql, [membreId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération du membre:', err);
          return res.status(500).json({ message: 'Erreur serveur' });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: 'Membre non trouvé' });
      }

      res.status(200).json(results[0]); // Renvoie le premier membre trouvé
  });
});

// Route pour récupérer un utilisateur par son ID
router.get('/users/:id', (req, res) => {
  const membreId = req.params.id;
  const sql = 'SELECT telephone FROM users WHERE username = ?';

  con.query(sql, [membreId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération de l\'utilisteur :', err);
          return res.status(500).json({ message: 'Erreur serveur' });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: 'utilisateur non trouvé' });
      }
      const telephone = results[0];
      res.status(200).json({telephone}); // Renvoie le premier membre trouvé
  });
});

// Route pour récupérer un utilisateur par son ID
router.get('/usersManage/:id', (req, res) => {
  const membreId = req.params.id;
  const sql = 'SELECT * FROM users WHERE username = ?';

  con.query(sql, [membreId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération de l\'utilisteur :', err);
          return res.status(500).json({ message: 'Erreur serveur' });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: 'utilisateur non trouvé' });
      }
      res.status(200).json(results); // Renvoie le premier membre trouvé
  });
});

// Route pour mettre à jour un membre
router.put('/membre/:id', upload.single('photo'), (req, res) => {
  const membreId = req.params.id;
  const { nom, prenoms, surnom, date_naissance, situation, enfants, profession, taille, pointure, adresse, telephone, facebook, whatsapp } = req.body;

  // Requête pour récupérer la photo actuelle avant mise à jour
  const selectSql = `SELECT photo FROM membres WHERE telephone = ?`;

  con.query(selectSql, [membreId], (selectErr, selectResult) => {
      if (selectErr) {
          console.error('Erreur lors de la récupération du membre:', selectErr);
          return res.status(500).json({ message: 'Erreur serveur' });
      }

      if (selectResult.length === 0) {
          return res.status(404).json({ message: 'Membre non trouvé' });
      }

      const currentPhoto = selectResult[0].photo;
      const photo = req.file ? req.file.filename : currentPhoto; // Si pas de nouvelle photo, garder l'ancienne

      const sql = `UPDATE membres 
                   SET nom = ?, prenoms = ?, surnom = ?, date_naissance = ?, situation = ?, enfants = ?, profession = ?, taille = ?, pointure = ?, adresse = ?, telephone = ?, facebook = ?, whatsapp = ?, photo = ?
                   WHERE telephone = ?`;

      const values = [nom, prenoms, surnom, date_naissance, situation, enfants, profession, taille, pointure, adresse, telephone, facebook, whatsapp, photo, membreId];

      con.query(sql, values, (err, result) => {
          if (err) {
              console.error('Erreur lors de la mise à jour:', err);
              return res.status(500).json({ message: 'Erreur serveur' });
          }

          if (result.affectedRows === 0) {
              return res.status(404).json({ message: 'Membre non trouvé' });
          }

          res.status(200).json({ message: 'Membre mis à jour avec succès', photo });
      });
  });
});

// Route pour supprimer un membre
router.delete('/membre/:id', (req, res) => {
  const membreId = req.params.id;
  
  const sql = 'DELETE FROM membres WHERE telephone = ?'; // Requête pour supprimer le membre par son ID
  
  con.query(sql, [membreId], (err, result) => {
      if (err) {
          console.error('Erreur lors de la suppression:', err);
          return res.status(500).json({ message: 'Erreur serveur' });
      }
      
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Membre non trouvé' });
      }
      
      res.status(200).json({ message: 'Membre supprimé avec succès' });
  });
});

// Route pour supprimer un membre
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;
  
  const sql = 'DELETE FROM users WHERE username = ?'; // Requête pour supprimer l'utilisateur par son ID
  
  con.query(sql, [userId], (err, result) => {
      if (err) {
          console.error('Erreur lors de la suppression:', err);
          return res.status(500).json({ message: 'Erreur serveur' });
      }
      
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Membre non trouvé' });
      }
      
      res.status(200).json({ message: 'Membre supprimé avec succès' });
  });
});

// Route pour récupérer le nombre de membres
router.get('/members/count', (req, res) => {
  const query = 'SELECT COUNT(*) AS count FROM membres';

  con.query(query, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération du nombre de membres:', err);
          return res.status(500).json({ error: 'Erreur serveur' });
      }

      // Retourner le nombre de membres dans la réponse
      const count = results[0].count;
      res.json({ count });
  });
});

//-----------------------------------------------------------Transaction----------------------------------------------------------------

//caisse
router.get('/caisse', (req, res)=>{
  if (req.session.username) {
    console.log(`Bienvenue ${req.session.username}`)
  } else {
    console.log('Non autorisé');
    console.log(`La session est : ${req.session.username}`)
  }
  const sql = "SELECT SUM(montant) AS montant FROM transactions WHERE type = 'revenue'"
  con.query(sql, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération du nombre de membres:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    const revenue = results[0].montant;
    const sql = "SELECT SUM(montant) AS montant FROM transactions WHERE type = 'depense'"
    con.query(sql, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération du nombre de membres:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      const depense = results[0].montant;
      const count = revenue - depense;

     return res.json({count})
    })
  })
})

// Route pour récupérer le nombre de revenue
router.get('/up', (req, res) => {
  const sql = "SELECT SUM(montant) AS montant FROM transactions WHERE type = 'revenue'"
  con.query(sql, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération du nombre de membres:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    const revenue = results[0].montant;
    return res.json({revenue})
  });
  
});

// Route pour récupérer le nombre de revenue
router.get('/down', (req, res) => {
  const sql = "SELECT SUM(montant) AS montant FROM transactions WHERE type = 'depense'"
  con.query(sql, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération du nombre de membres:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    const depense = results[0].montant;
    return res.json({depense})
  });
  
});

// Route pour gérer les transactions
router.post('/create_transactions', (req, res) => {

  const { type, description, montant, expediteur } = req.body;

  const sql1 = "SELECT * FROM transactions WHERE description = 'cotisation' AND expediteur = ?"
  con.query(sql1, expediteur, (err, result)=>{
    if (result.length!==0 && description === 'cotisation' ){
      console.log(result)
      return res.json({message: "Déjà dans transaction, veuillez juste le mmodifier."})
    } else {

    // Validation basique des champs
    if (!type || !description || !montant || !expediteur) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }
  
    // Date actuelle au format 'YYYY-MM-DD HH:MM:SS'
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const sql = 'INSERT INTO transactions (`date`, `type`, `description`, `montant`, `expediteur`) VALUES (?, ?, ?, ?, ?)';
  
    // Exécution de la requête MySQL
    con.query(sql, [currentDate, type, description, montant, expediteur], (err, result) => {
      if (err) {
        console.error('Erreur lors de l’insertion des données dans la base:', err);
        return res.status(500).json({ error: 'Erreur serveur lors de l’enregistrement de la transaction.' });
      }
      res.status(201).json({ message: 'Transaction enregistrée avec succès!' });
    });
    }
  })
});

  // Route pour récupérer toutes les transactions
router.get('/transactions', (req, res) => {
    const sql = 'SELECT * FROM transactions ORDER BY `date` DESC'; // Récupérer toutes les transactions
  
    con.query(sql, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des transactions:', err);
        return res.status(500).json({ error: 'Erreur serveur lors de la récupération des transactions.' });
      }
      res.status(200).json(results);
    });
  });
// Route pour mettre à jour une transaction
router.put('/transactions/:date', async (req, res) => {
    const { date } = req.params;
    const { type, description, montant, expediteur } = req.body;
  
    // Vérifie si tous les champs requis sont présents
    if (!type || !description || !montant || !expediteur) {
      return res.status(400).json({ error: 'Tous les champs doivent être remplis.' });
    }
  
    try {
      // Met à jour la transaction dans la base de données
      const query = `
        UPDATE transactions 
        SET type = ?, description = ?, montant = ?, expediteur = ?, date_modification = NOW() 
        WHERE date = ?`;
      const values = [type, description, montant, expediteur, date];
  
      con.query(query, values, (error, result) => {
        if (error) {
          console.error('Erreur lors de la mise à jour de la transaction:', error);
          return res.status(500).json({ error: 'Erreur serveur.' });
        }
  
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Transaction non trouvée.' });
        }
  
        res.json({ message: 'Transaction mise à jour avec succès.' });
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la transaction:', error);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  });
    
  router.delete('/transactions/:formattedDate', (req, res) => {
    const date = req.params.formattedDate;
    console.log(date)
    const sql = 'DELETE FROM transactions WHERE date = ?';
    con.query(sql, [date], (error, results) => {
        console.log(results)
        if (error) {
            return res.status(500).json({ error: 'Erreur lors de la suppression de la transaction' });
        }
        res.json({ message: 'Transaction supprimée avec succès' });
    });
    });

// Endpoint pour récupérer toutes les transactions
router.get('/transactions', async (req, res) => {
  try {
      const [rows] = await con.execute("SELECT * FROM transactions WHERE description = 'cotisation'");
      res.json(rows);
  } catch (error) {
      console.error('Erreur lors de la récupération des transactions :', error);
      res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// Route pour enregistrer des données dans un fichier JSON
router.post('/save-json', async (req, res) => {
  const data = req.body; // Les données envoyées par le client
  console.log(data)
  try {
      const jsonData = JSON.stringify(data, null, 2);
      await writeFile('data.json', jsonData);
      res.status(200).json({ message: 'Données enregistrées avec succès !' });
  } catch (err) {
      res.status(500).json({ message: 'Erreur lors de l\'écriture du fichier JSON', error: err });
  }
}); 

// Autres routes peuvent être ajoutées ici

// Obtenir tous les membres
router.get('/membres2', (req, res) => {
    con.query('SELECT * FROM membres', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Obtenir tous les utilisateurs
router.get('/users', (req, res) => {
  con.query('SELECT * FROM users', (err, results) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.json(results);
  });
});




// Ajouter un membre
router.post('/membres_bureau_add', (req, res) => {

    const telephone = req.body.telephone
    const titre = req.body.titre;

    console.log(telephone)
    console.log(titre)

    const sql1 = "SELECT * FROM membres WHERE telephone = ?"
    con.query(sql1, telephone, (err, result) => {
      if (err){
        return res.json({message: "Erreur: " + err})

      }
      if (result.length === 0){
        return res.json({message: "Aucun numero correspondant dans la liste de membre"})
      }
    })

    const sql = `UPDATE membres SET type = ? WHERE telephone = ?`;
    const values = [titre, telephone];

    con.query(sql, values, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Membre ajouté avec succès' });
    });
});

// Modifier un membre
router.put('/membres/:telephone', (req, res) => {
    const { telephone } = req.params;
    const {
        nom,
        prenoms,
        situation,
        enfants,
        profession,
        taille,
        pointure,
        adresse,
        facebook,
        whatsapp,
        photo,
    } = req.body;

    const sql = `UPDATE membres SET nom = ?, prenoms = ?, situation = ?, enfants = ?, profession = ?, taille = ?, pointure = ?, adresse = ?, facebook = ?, whatsapp = ?, photo = ? WHERE telephone = ?`;
    const values = [nom, prenoms, situation, enfants, profession, taille, pointure, adresse, facebook, whatsapp, photo, telephone];

    con.query(sql, values, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Membre modifié avec succès' });
    });
});

// Supprimer un membre
// router.delete('/membres/:telephone', (req, res) => {
//     const { telephone } = req.params;

//     con.query('DELETE FROM membres WHERE telephone = ?', [telephone], (err) => {
//         if (err) {
//             return res.status(500).json({ error: err.message });
//         }
//         res.json({ message: 'Membre supprimé avec succès' });
//     });
// });

// Modifier un membre
router.put('/updateMontant', (req, res) => {
  const montant3 = req.body.montant3;
  console.log(montant3)
  const sql = `UPDATE montant SET montant = ?`;
  const values = [montant3];

  con.query(sql, values, (err, result) => {
      if (err) {
        console.log(err)
          return res.status(500).json({ error: err.message });
      }
      res.json({ result });
  });
});
// Endpoint pour récupérer toutes les transactions
router.get('/montant', (req, res) => {
  try {
    const sql = "SELECT montant FROM montant";
      con.query(sql, (err, result) => {
        if (err) return;
        res.json({result})
      })
      // res.json(montant);
      // console.log(montant)
  } catch (error) {
      console.error('Erreur lors de la récupération du montant :', error);
      res.status(500).json({ message: 'Erreur du serveur' });
  }
});

export default router;