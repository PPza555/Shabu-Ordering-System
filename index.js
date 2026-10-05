const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();

// Creating the Express server
const app = express();

// static resourse & templating engine
app.use(express.static('public'));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// // Connect to SQLite database
// let db = new sqlite3.Database(path.join(__dirname, 'restaurant.db'), (err) => {
//   if (err) {
//       return console.error(err.message);
//   }
//   console.log('Connected to the SQlite database.');
// });

// routing path
// Menu
app.get('/', (req, res) => {
  db.get('SELECT * FROM customers ORDER BY RANDOM() LIMIT 1', (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }

    res.render('form', { data: rows });
  });
});

app.get('/cart', (req, res) => {

    const table_id = req.query.table_id;
    res.render('cart', {
        table_id: table_id
    });

});

// หน้าเมนูหลัก
router.get('/menu', async (req, res) => {
    // ดึง data (categories) และ data2 (items)
    res.render('menu', { data, data2 });
});

// หน้ารายละเอียดสินค้า
router.get('/menu/item/:id', async (req, res) => {
    const itemId = req.params.id;
    // ค้นหาข้อมูลสินค้าตาม itemId จาก Database
    const item = data2.find(i => i.menu_item_id == itemId); 
    
    if (!item) {
        return res.redirect('/menu');
    }
    
    res.render('menu-detail', { item });
});























// Starting the server
app.listen(port, () => {
   console.log("Server started.");
 });