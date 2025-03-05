// MODEL
// router.post('/', (req, res) => {
//     const variable = req.body;
//     const sql = ""

//     con.query(sql, [data], (err, result) => {
//         if (err) return res.json({message: "Erreur back dans "})
//         return res.json({result})
//     })
// })

// -----------------------------------------------------------MEMBER-------------------------------------------------------------------
// CREATE - Mamber
router.post('/create_member', (req, res) => {
    const {callnumber, name, lastname, cin, mail, birth, job, height} = req.body;
    const sql = "INSERT INTO member (callnumber, name, lastname, cin, mail, birth, job, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"

    con.query(sql, [callnumber, name, lastname, cin, mail, birth, job, height], (err, result) => {
        if (err) return res.json({message: "Erreur back dans le post member : " + err})
        return res.json({result})
    })
})

// READ - Member
router.get('/read_member', (req, res) => {
    const variable = req.body;
    const sql = "SELECT * FROM member"

    con.query(sql, [data], (err, result) => {
        if (err) return res.json({message: "Erreur back dans read member : " + err})
        return res.json({result})
    })
})

// UPDATE - Member
router.put('/update_member', (req, res) => {
    const {callnumber, name, lastname, cin, mail, birth, job, height} = req.body;
    const sql = "UPDATE member SET (callnumber = ?, name = ?, lastname = ?, cin = ?, mail = ?, birth = ?, job = ?, height = ?) WHERE callnumber = ?"

    con.query(sql, [callnumber, name, lastname, cin, mail, birth, job, height, callnumber], (err, result) => {
        if (err) return res.json({message: "Erreur back dans update member : " + err})
        return res.json({result})
    })
})

// DELETE - Member
router.delete('/delete_member', (req, res) => {
    const callnumber = req.body;
    const sql = "DELETE FROM member WHERE callnumber = ?"

    con.query(sql, [callnumber], (err, result) => {
        if (err) return res.json({message: "Erreur back dans delete member : " + err})
        return res.json({result})
    })
})