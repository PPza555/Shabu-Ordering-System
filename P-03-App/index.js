const express = require("express");
const path = require("path");
const sqlite3 = require('sqlite3').verbose();
const port = 3000;

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let db = new sqlite3.Database(path.join(__dirname, 'restaurant.db'), (err) => {
  if (err) {
      return console.error(err.message);
  }
  console.log('Connected to the SQlite database.');
});

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "node_modules/bootstrap/dist/")));

// app.get('/', function (req, res) {
//     const table_id = req.query.table_id || 0;
//     db.all('SELECT * FROM category', (err, rows) => {
//         res.render('home', { data: rows || [], table_id });
//     });
// });

// app.get('/menu', function (req, res) {
app.get('/', function (req, res) {
    const table_id = req.query.table_id || 0;
    db.all('SELECT * FROM category', (err, rows) => {
        db.all('SELECT * FROM menu_items', (err2, menuItems) => {
            if (err) {
                console.log(err.message);
                return res.render('menu', { data: [], data2: [], table_id });
            }
            res.render('menu', { data: rows || [], data2: menuItems || [], table_id });
        });
    });
});

app.get('/orders', function (req, res) {
    db.all('SELECT * FROM orders ORDER BY start_time ASC', (err, orders) => {
        if (err) return res.render('orders', { orders: [], orderItems: {} });

        db.all(`
            SELECT oi.*, mi.item_name, s.description AS status_name
            FROM order_items oi
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
            LEFT JOIN item_status s ON oi.status_code = s.status_code
            WHERE oi.status_code = 1
        `, (err2, items) => {
            const orderItems = {};
            items.forEach(item => {
                if (!orderItems[item.order_id]) orderItems[item.order_id] = [];
                orderItems[item.order_id].push(item);
            });
            res.render('orders', { orders, orderItems });
        });
    });
});

app.get('/cashier', function (req, res) {
    const table_id = req.query.table_id || 0;
    db.all('SELECT DISTINCT table_number FROM orders WHERE paid = 0 ORDER BY table_number', (err, rows) => {
        const tables = rows.map(row => row.table_number);
        db.all('SELECT * FROM payments ORDER BY paid_at DESC', (err2, payments) => {
            res.render('cashier', { tables, payments, table_id });
        });
    });
});

app.get('/serve', function (req, res) {
    db.all('SELECT * FROM orders ORDER BY start_time ASC', (err, orders) => {
        if (err) return res.render('serve', { orders: [], orderItems: {} });

        db.all(`
            SELECT oi.*, mi.item_name, mi.price, s.description AS status_name
            FROM order_items oi
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
            LEFT JOIN item_status s ON oi.status_code = s.status_code
            WHERE oi.status_code = 2
        `, (err2, items) => {
            const orderItems = {};
            items.forEach(item => {
                if (!orderItems[item.order_id]) orderItems[item.order_id] = [];
                orderItems[item.order_id].push(item);
            });
            res.render('serve', { orders, orderItems });
        });
    });
});

app.post('/order-status/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    db.run('UPDATE order_items SET status_code = 2 WHERE order_id = ?', [orderId], function(err) {
        if (err) return res.json({ success: false });
        io.emit('orderServed', { orderId });
        res.json({ success: true });
    });
});

app.post('/serve-done/:order_id', (req, res) => {
    const order_id = req.params.order_id;
    db.run('UPDATE order_items SET status_code = 3 WHERE order_id = ? AND status_code = 2', [order_id], function(err) {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

app.post('/order', (req, res) => {
    const cart = req.body.cart;
    const table_id = req.body.table_id || 0;

    if (!cart || !Array.isArray(cart) || cart.length === 0 || !table_id) {
        return res.json({ success: false });
    }

    db.run(
        'INSERT INTO orders (table_number, start_time, end_time) VALUES (?, datetime("now"), datetime("now", "+5 minutes"))',
        [table_id],
        function(err) {
            if (err) return res.json({ success: false });
            const order_id = this.lastID;

            const stmt = db.prepare('INSERT INTO order_items (order_id, menu_item_id, status_code, quantity, size) VALUES (?, ?, ?, ?, ?)');
            try {
                cart.forEach(item => {
                    stmt.run(order_id, item.menu_item_id, 1, item.qty, item.size);
                });
                stmt.finalize();
                io.emit('newOrder', { order_id, table_id, cart });
                res.json({ success: true, order_id });
            } catch (e) {
                res.json({ success: false });
            }
        }
    );
});

app.get('/history', (req, res) => {
    const table_id = req.query.table_id || 0;
    db.all('SELECT * FROM orders WHERE table_number = ? AND paid = 0 ORDER BY start_time DESC', [table_id], (err, orders) => {
        if (err) return res.render('history', { orders: [], orderItems: {}, table_id });
        db.all(`
            SELECT oi.*, mi.item_name, mi.price, s.description AS status_name
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
            LEFT JOIN item_status s ON oi.status_code = s.status_code
        `, (err2, items) => {
            const orderItems = {};
            items.forEach(item => {
                if (!orderItems[item.order_id]) orderItems[item.order_id] = [];
                orderItems[item.order_id].push(item);
            });
            res.render('history', { orders, orderItems, table_id });
        });
    });
});

app.get('/order-history', function (req, res) {
    const currentPage = Number(req.query.page) || 1;
    db.all('SELECT * FROM orders ORDER BY start_time DESC', (err, orders) => {
        if (err) return res.render('orderhistory', { orders: [], orderItems: {} });
        db.all(`
            SELECT oi.*, mi.item_name, mi.price, s.description AS status_name
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
            LEFT JOIN item_status s ON oi.status_code = s.status_code
        `, (err2, items) => {
            const orderItems = {};
            items.forEach(item => {
                if (!orderItems[item.order_id]) orderItems[item.order_id] = [];
                orderItems[item.order_id].push(item);
            });
            res.render('orderhistory', { orders, orderItems, currentPage });
        });
    });
});

app.get('/payment', function (req, res) {
    const table_id = req.query.table_id || 0;
    db.all(`
        SELECT * FROM orders WHERE paid = 0 AND table_number = ? ORDER BY order_id DESC
    `, [table_id], (err, orders) => {
        if (err) return res.render('payment', { table_id, allOrderedItems: [], orders: [], orderItems: {}, noItems: true });

        const orderIds = orders.map(o => o.order_id);
        if (orderIds.length === 0) {
            return res.render('payment', { table_id, allOrderedItems: [], orders: [], orderItems: {}, noItems: true });
        }

        db.all(`
            SELECT mi.item_name, oi.size, SUM(oi.quantity) AS total_qty, mi.price, oi.order_id
            FROM order_items oi
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
            WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
            GROUP BY mi.item_name, oi.size, mi.price, oi.order_id
            ORDER BY mi.item_name, oi.size
        `, orderIds, (err2, allOrderedItems) => {
            db.all(`
                SELECT oi.*, mi.item_name, mi.price, s.description AS status_name
                FROM order_items oi
                LEFT JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
                LEFT JOIN item_status s ON oi.status_code = s.status_code
                WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
            `, orderIds, (err3, items) => {
                const orderItems = {};
                items.forEach(item => {
                    if (!orderItems[item.order_id]) orderItems[item.order_id] = [];
                    orderItems[item.order_id].push(item);
                });
                res.render('payment', { table_id, allOrderedItems, orders, orderItems, noItems: false });
            });
        });
    });
});

app.get('/api/payment-summary', (req, res) => {
    const table_id = req.query.table_id || 0;
    db.all(`
        SELECT mi.item_name, oi.size, SUM(oi.quantity) AS quantity, mi.price
        FROM order_items oi
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
        WHERE oi.order_id IN (
            SELECT order_id FROM orders WHERE paid = 0 AND table_number = ?
        )
        GROUP BY mi.item_name, oi.size, mi.price
        ORDER BY mi.item_name, oi.size
    `, [table_id], (err, items) => {
        res.json({ items });
    });
});

app.post('/api/payment/cashier', (req, res) => {
    const { table_id, amount } = req.body;
    const paid_at = new Date().toISOString();
    db.run(
        'INSERT INTO payments (table_number, amount, method, paid_at, paid) VALUES (?, ?, ?, ?, ?)',
        [table_id, amount, 'cashier', paid_at, 0],
        function (err2) {
            if (err2) return res.json({ success: false, message: 'Insert failed' });
            io.emit('newPayment', {
                table_number: table_id,
                amount,
                method: 'cashier',
                paid_at,
                paid: 0
            });
            res.json({ success: true });
        }
    );
});

app.get('/payment/success', (req, res) => {
    const table_id = req.query.table_id;
    const amount = req.query.amount;
    db.run(
        'INSERT INTO payments (table_number, amount, method, paid_at, paid) VALUES (?, ?, ?, ?, ?)',
        [table_id, amount, 'QR', new Date().toISOString(), 0],
        function (err2) {
            io.emit('paymentCompleted', { table_id, amount });
            res.send(`
                <html>
                <body>
                    <div>QR Payment recorded, please complete at cashier.</div>
                    <script>
                        setTimeout(function(){ window.close(); }, 2000);
                    </script>
                </body>
                </html>
            `);
        }
    );
});

app.post('/api/payment/complete', (req, res) => {
    const { table_id } = req.body;
    db.run('UPDATE payments SET paid = 1 WHERE table_number = ? AND paid = 0', [table_id], function(err) {
        if (err) return res.json({ success: false });
        db.run('UPDATE orders SET paid = 1 WHERE table_number = ?', [table_id]);
        res.json({ success: true });
    });
});

// // 4. หน้าตะกร้าสินค้า (GET /cart)
// router.get('/cart', (req, res) => {
//     initCart(req);
//     const cart = req.session.cart;

//     let cartItems = [];
//     let totalPrice = 0;
//     let totalItems = 0;

//     // รวบรวมข้อมูลรายการอาหารในตะกร้าคำนวณราคารวม
//     for (const [itemId, qty] of Object.entries(cart)) {
//         const item = menuItems.find(i => i.menu_item_id === itemId);
//         if (item && qty > 0) {
//             const subtotal = item.price * qty;
//             cartItems.push({
//                 ...item,
//                 quantity: qty,
//                 subtotal: subtotal
//             });
//             totalPrice += subtotal;
//             totalItems += qty;
//         }
//     }

//     res.render('cart', {
//         cartItems,
//         totalPrice,
//         totalItems
//     });
// });

// // 5. API อัปเดต/เพิ่ม-ลด จำนวนสินค้าในตะกร้า (POST /cart/update)
// app.post('/cart/update', (req, res) => {
//     initCart(req);
//     const { itemId, change } = req.body;

//     if (itemId) {
//         const currentQty = req.session.cart[itemId] || 0;
//         const newQty = currentQty + parseInt(change);

//         if (newQty <= 0) {
//             delete req.session.cart[itemId];
//         } else {
//             req.session.cart[itemId] = newQty;
//         }
//     }

//     res.json({ success: true, cart: req.session.cart });
// });

// // 6. API ลบสินค้าออกจากตะกร้า (POST /cart/remove)
// app.post('/cart/remove', (req, res) => {
//     initCart(req);
//     const { itemId } = req.body;

//     if (itemId && req.session.cart[itemId]) {
//         delete req.session.cart[itemId];
//     }

//     res.json({ success: true });
// });

// // 7. API ยืนยันการสั่งซื้อ (POST /checkout)
// app.post('/checkout', (req, res) => {
//     initCart(req);

//     // เคลียร์ตะกร้าสินค้าหลังสั่งอาหารเรียบร้อย
//     req.session.cart = {};

//     res.send('<script>alert("สั่งอาหารเรียบร้อยแล้ว!"); window.location.href="/menu";</script>');
// });

io.on('connection', (socket) => {
    socket.on('paymentCashier', (data) => {
        socket.broadcast.emit('paymentCashier', data);
    });
});

http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});