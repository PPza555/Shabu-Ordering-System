// Helper to remove cart cookie
function removeCartCookie() {
    document.cookie = "cart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}
function saveCart() {
    const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString();
    document.cookie = "cart=" + encodeURIComponent(JSON.stringify(cart)) + "; expires=" + expires + "; path=/";
}

function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

function loadCart() {
    const saved = getCookie('cart');
    cart = saved ? JSON.parse(decodeURIComponent(saved)) : [];
}

let cart = [];
loadCart();
updateCartWidget();

function updateCartWidget() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalPriceDiv = document.getElementById('cartTotalPrice');
    let totalPrice = 0;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="text-muted">ยังไม่มีสินค้าในตะกร้า</p>';
        cartTotalPriceDiv.textContent = '';
        return;
    }

    cartItemsDiv.innerHTML = cart.map((item, idx) => {
    let displayPrice = item.price || 0;
    const itemTotal = displayPrice * item.qty;
    totalPrice += itemTotal;
        return `
        <div class="d-flex align-items-center mb-3">
            <img src="${item.img}" style="width:48px;height:48px;object-fit:cover;" class="me-2 rounded">
            <div class="flex-grow-1">
                <div>${item.name} <span class="badge bg-info ms-2">${item.size || ''}</span></div>
                <div class="input-group input-group-sm mt-1" style="width: 120px;">
                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick="changeCartQty(${idx}, -1)">-</button>
                    <input type="text" class="form-control text-center" value="${item.qty}" readonly>
                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick="changeCartQty(${idx}, 1)">+</button>
                </div>
            </div>
            <div class="fw-bold ms-2">${itemTotal.toFixed(2)} บาท</div>
            <button class="btn btn-sm btn-danger ms-2" onclick="removeCartItem(${idx})">ลบ</button>
        </div>
        `;
    }).join('');

    cartTotalPriceDiv.textContent = `รวมทั้งหมด: ${totalPrice.toFixed(2)} บาท`;
}

function changeCartQty(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].qty += delta;
    if (cart[idx].qty < 1) cart[idx].qty = 1;
    saveCart();
    updateCartWidget();
}

function removeCartItem(idx) {
    cart.splice(idx, 1);
    saveCart();
    updateCartWidget();
}

document.querySelectorAll('[data-bs-target="#cartOffcanvas"]').forEach(btn => {
    btn.addEventListener('click', function () {
        updateCartWidget();
    });
});

document.getElementById('checkoutBtn').addEventListener('click', function () {
    if (cart.length === 0) {
        // แสดง Modal
        const modal = new bootstrap.Modal(document.getElementById('cartEmptyModal'));
        modal.show();

        // เมื่อกดปุ่ม "ไปที่หน้าเมนู"
        document.getElementById('goMenuBtn').addEventListener('click', () => {
            window.location.href = "/menu";
        });

        return;
    }

    const table_id = localStorage.getItem('table_id');

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(255,255,255,0.7)';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const msgBox = document.createElement('div');
    msgBox.className = "p-4 bg-white rounded shadow text-center";
    msgBox.innerHTML = `
        <div class="spinner-border text-success mb-3" role="status"></div>
        <div class="fw-bold fs-5">กำลังบันทึกออเดอร์...</div>
    `;
    overlay.appendChild(msgBox);
    document.body.appendChild(overlay);

    fetch('/order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cart, table_id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            msgBox.innerHTML = `<div class="fw-bold fs-5 text-success">บันทึกออเดอร์เรียบร้อยแล้ว!</div>`;
            cart = [];
            removeCartCookie();
            updateCartWidget();
            setTimeout(() => {
                bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('cartOffcanvas')).hide();
                overlay.remove();
            }, 1200);
        } else {
            msgBox.innerHTML = `<div class="fw-bold fs-5 text-danger">เกิดข้อผิดพลาดในการบันทึกออเดอร์</div>`;
            setTimeout(() => overlay.remove(), 1500);
        }
    })
    .catch(() => {
        msgBox.innerHTML = `<div class="fw-bold fs-5 text-danger">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</div>`;
        setTimeout(() => overlay.remove(), 1500);
    });
});